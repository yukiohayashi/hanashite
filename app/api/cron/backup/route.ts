import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getSettings() {
  const { data, error } = await supabase
    .from('auto_creator_settings')
    .select('*');

  if (error) {
    throw new Error('設定の取得に失敗しました');
  }

  const settings: Record<string, string> = {};
  data?.forEach((item) => {
    settings[item.setting_key] = item.setting_value;
  });

  return settings;
}

async function logExecution(
  status: string,
  message?: string,
  errorMessage?: string,
  backupFile?: string
) {
  await supabase.from('backup_logs').insert({
    execution_type: 'cron',
    status,
    message,
    error_message: errorMessage,
    backup_file: backupFile,
    executed_at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('x-api-secret');
    if (authHeader !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getSettings();

    if (settings.backup_enabled !== 'true') {
      console.log('DBバックアップが停止中です');
      return NextResponse.json({
        success: false,
        message: 'DBバックアップが停止中です',
      });
    }

    const backupDir = process.env.BACKUP_DIR || './backups';
    const date = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
    const backupFile = `${backupDir}/supabase_backup_${date}_${time}.sql.gz`;

    const containerName = process.env.SUPABASE_DB_CONTAINER || 'supabase_db_anke-nextjs';
    const dbUser = process.env.SUPABASE_DB_USER || 'postgres';
    const dbName = process.env.SUPABASE_DB_NAME || 'postgres';

    const command = `mkdir -p ${backupDir} && docker exec ${containerName} pg_dump -U ${dbUser} -d ${dbName} | gzip > ${backupFile}`;

    console.log('バックアップ実行:', command);

    const { stderr } = await execAsync(command);

    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`バックアップエラー: ${stderr}`);
    }

    const retentionDays = parseInt(settings.backup_retention_days || '30');
    const cleanupCommand = `find ${backupDir} -name "supabase_backup_*.sql.gz" -mtime +${retentionDays} -delete`;
    await execAsync(cleanupCommand);

    const sizeCommand = `du -h ${backupFile} | cut -f1`;
    const { stdout: size } = await execAsync(sizeCommand);

    await logExecution(
      'success',
      `バックアップ完了: ${backupFile} (${size.trim()})`,
      undefined,
      backupFile
    );

    return NextResponse.json({
      success: true,
      message: 'バックアップが完了しました',
      backup_file: backupFile,
      size: size.trim(),
    });
  } catch (error) {
    console.error('CRON backup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'バックアップに失敗しました';

    await logExecution('error', undefined, errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
