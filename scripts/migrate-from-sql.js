const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migratePosts() {
  console.log('Starting posts migration from SQL file...');
  
  const sqlContent = fs.readFileSync('/Users/yukki/htdocs/kusanagi_html_anke/anke_db (1).sql', 'utf8');
  
  const insertMatches = sqlContent.match(/INSERT INTO `wp_posts`[^;]+;/gs);
  
  if (!insertMatches) {
    console.error('No INSERT statements found');
    return;
  }

  console.log(`Found ${insertMatches.length} INSERT statements`);
  
  let totalPosts = 0;
  let migratedPosts = 0;
  
  for (const insertStatement of insertMatches) {
    const valuesMatch = insertStatement.match(/VALUES\s+([\s\S]+);$/);
    if (!valuesMatch) continue;
    
    const valuesString = valuesMatch[1];
    const rows = [];
    
    let currentRow = '';
    let inString = false;
    let escapeNext = false;
    let parenDepth = 0;
    
    for (let i = 0; i < valuesString.length; i++) {
      const char = valuesString[i];
      
      if (escapeNext) {
        currentRow += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        currentRow += char;
        continue;
      }
      
      if (char === "'" && !escapeNext) {
        inString = !inString;
        currentRow += char;
        continue;
      }
      
      if (!inString) {
        if (char === '(') {
          parenDepth++;
          if (parenDepth === 1) {
            currentRow = '';
            continue;
          }
        } else if (char === ')') {
          parenDepth--;
          if (parenDepth === 0) {
            rows.push(currentRow);
            currentRow = '';
            continue;
          }
        }
      }
      
      currentRow += char;
    }
    
    for (const row of rows) {
      totalPosts++;
      
      const values = parseRow(row);
      if (!values || values.length < 23) continue;
      
      const [
        id, post_author, post_date, post_date_gmt, post_content, post_title,
        post_excerpt, post_status, comment_status, ping_status, post_password,
        post_name, to_ping, pinged, post_modified, post_modified_gmt,
        post_content_filtered, post_parent, guid, menu_order, post_type,
        post_mime_type, comment_count
      ] = values;
      
      if (post_type !== 'post' || post_status !== 'publish') {
        continue;
      }
      
      const postData = {
        id: parseInt(id),
        user_id: parseInt(post_author),
        title: post_title,
        content: post_content,
        status: 'published',
        created_at: post_date_gmt,
        updated_at: post_modified_gmt
      };
      
      const { error } = await supabase
        .from('posts')
        .upsert(postData, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error migrating post ${id}:`, error.message);
      } else {
        migratedPosts++;
        if (migratedPosts % 100 === 0) {
          console.log(`Migrated ${migratedPosts} posts...`);
        }
      }
    }
  }
  
  console.log(`\nMigration complete!`);
  console.log(`Total rows processed: ${totalPosts}`);
  console.log(`Posts migrated: ${migratedPosts}`);
}

function parseRow(row) {
  const values = [];
  let current = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === "'") {
      if (inString) {
        inString = false;
        values.push(current);
        current = '';
      } else {
        inString = true;
      }
      continue;
    }
    
    if (!inString && char === ',') {
      if (current.trim() === '' || current.trim() === 'NULL') {
        values.push(null);
      } else if (!isNaN(current.trim())) {
        values.push(current.trim());
      }
      current = '';
      continue;
    }
    
    if (inString) {
      current += char;
    } else if (char !== '\t' && char !== ' ') {
      current += char;
    }
  }
  
  if (current.trim()) {
    if (current.trim() === 'NULL') {
      values.push(null);
    } else {
      values.push(current.trim());
    }
  }
  
  return values;
}

migratePosts().catch(console.error);
