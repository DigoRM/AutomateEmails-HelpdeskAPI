import json

db_path = r'c:\Users\rodri\OneDrive\Ambiente de Trabalho\AutomateEmails\backend\database.json'

with open(db_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

original_len = len(db['queue'])
db['queue'] = [item for item in db['queue'] if item.get('to_email') != 'enguerrantriquet7@gmail.com']

if len(db['queue']) < original_len:
    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    print(f"Successfully removed record. New length: {len(db['queue'])}")
else:
    print("Record not found.")
