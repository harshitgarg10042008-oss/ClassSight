#!/usr/bin/env python3
from pathlib import Path
import yaml
path = Path(__file__).resolve().parents[1] / 'k8s' / 'classsight.yaml'
documents = list(yaml.safe_load_all(path.read_text()))
required = {'Namespace','Secret','ConfigMap','PersistentVolumeClaim','Service','Deployment'}
actual = {doc.get('kind') for doc in documents if doc}
missing = required - actual
if missing:
    raise SystemExit(f'missing kinds: {sorted(missing)}')
print(f'VALID_YAML_DOCUMENTS={len(documents)}')
print('KINDS=' + ','.join(sorted(actual)))
print('DEPLOYMENTS=' + ','.join(doc['metadata']['name'] for doc in documents if doc.get('kind') == 'Deployment'))
