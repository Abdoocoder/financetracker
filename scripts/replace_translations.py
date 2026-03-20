import os
import json
import re

# Load ar.json
ar_json_path = os.path.join(os.path.dirname(__file__), '..', 'mobile', 'fajrak_flutter', 'assets', 'i18n', 'ar.json')
with open(ar_json_path, 'r', encoding='utf-8') as f:
    ar_data = json.load(f)

# Create reverse map
reverse_map = {}
for k, v in ar_data.items():
    if v not in reverse_map:
        reverse_map[v] = k

lib_dir = os.path.join(os.path.dirname(__file__), '..', 'mobile', 'fajrak_flutter', 'lib')

replaced_count = 0
files_changed = 0

def process_file(filepath):
    global replaced_count, files_changed
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Sort keys by length descending to match longest strings first
    sorted_ar_strings = sorted(reverse_map.keys(), key=len, reverse=True)

    for ar_str in sorted_ar_strings:
        if ar_str not in content:
            continue
            
        key = reverse_map[ar_str]
        
        # Replace 'ar_str' or "ar_str" with 'key'.tr()
        # Handle simple quotes
        escaped_ar = re.escape(ar_str)
        
        # We need to account for const Text('...') becoming Text('...'.tr())
        # First fix const Text('str') -> Text('str')
        content = re.sub(r'const\s+Text\s*\(\s*([\'"])' + escaped_ar + r'\1', r'Text(\1' + escaped_ar + r'\1', content)
        
        # Now replace the string itself: 'str' -> 'key'.tr()
        # Look for the string wrapped in single or double quotes
        content = re.sub(r'([\'"])' + escaped_ar + r'\1', f"'{key}'.tr()", content)

    # Some edge cases: const EdgeInsets... contains Text inside, etc. Dart fix handles most const removals, but let's try to remove obvious ones
    # We will rely on `dart fix --apply` to clean up invalid consts!
    
    # Ensure import is present if replacements were made
    if content != original_content:
        # Check if easy_localization is imported
        if 'easy_localization.dart' not in content:
            content = "import 'package:easy_localization/easy_localization.dart';\n" + content
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        files_changed += 1
        replaced_count += content.count(".tr()") - original_content.count(".tr()")

for root, _, files in os.walk(lib_dir):
    for file in files:
        if file.endswith('.dart'):
            process_file(os.path.join(root, file))

print(f"Done! Changed {files_changed} files. Total replacement estimates: {replaced_count}.")
