const fs = require('fs')
const path = require('path')

const apiDir = path.join(__dirname, '..', 'app', 'api')

function walk(dir) {
  const results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) results.push(...walk(full))
    else if (file === 'route.ts') results.push(full)
  }
  return results
}

const files = walk(apiDir)
let updated = 0

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')

  // Only process files that use the service role key inline
  if (!content.includes('SUPABASE_SERVICE_ROLE_KEY')) continue

  // Replace: import { createClient } from '@supabase/supabase-js'
  if (!content.includes("import { createAdminClient } from '@/lib/supabase/admin'")) {
    content = content.replace(
      /import \{ createClient \} from '@supabase\/supabase-js'\r?\n/,
      "import { createAdminClient } from '@/lib/supabase/admin'\n"
    )
  } else {
    // Already has admin import, just remove the raw one
    content = content.replace(
      /import \{ createClient \} from '@supabase\/supabase-js'\r?\n/,
      ''
    )
  }

  // Replace: const supabase = createClient(\n  url,\n  serviceRoleKey\n)
  content = content.replace(
    /const supabase = createClient\(\s*\n\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*\n\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!\s*\n\)/g,
    'const supabase = createAdminClient()'
  )

  fs.writeFileSync(file, content, 'utf8')
  console.log('Updated:', path.relative(process.cwd(), file))
  updated++
}

console.log(`\nDone — ${updated} file(s) updated.`)
