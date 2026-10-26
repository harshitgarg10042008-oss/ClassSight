import csv

with open('runtime-check/sweep_haar.csv') as f:
    rows = list(csv.DictReader(f))

admissible = [r for r in rows if r['admissible'] == 'True']
admissible.sort(key=lambda r: float(r['class_auto_pct']), reverse=True)
print('Top 10 admissible parameter sets:')
header = "t_auto   m      class_auto%  outsider_auto%  class_wrong%  class_review%"
print(header)
for r in admissible[:10]:
    print(f"{r['t_auto']:8} {r['m']:6} {r['class_auto_pct']:12} {r['outsider_auto_pct']:15} {r['class_wrong_auto_pct']:13} {r['class_review_pct']:13}")
print(f'Total admissible: {len(admissible)}/{len(rows)}')
print(f'\nSelected: T_auto=8.0, M=0.0, T_review=9.74')
