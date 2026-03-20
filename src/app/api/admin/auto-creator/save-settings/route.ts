import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await request.json();
    const { updates } = body;

    const now = new Date().toISOString();

    for (const update of updates) {
      const { error } = await supabase
        .from('auto_creator_settings')
        .upsert({ 
          setting_key: update.setting_key,
          setting_value: update.setting_value, 
          updated_at: now 
        }, {
          onConflict: 'setting_key'
        });
      
      if (error) {
        console.error(`Error updating ${update.setting_key}:`, error);
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save settings' 
    }, { status: 500 });
  }
}
