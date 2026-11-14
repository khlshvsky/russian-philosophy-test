#!/usr/bin/env python3
"""Переводит книги (TXT, EPUB, FB2, PDF) в books/<ключ>.txt.

Запуск: python3 -I scripts/prep_books.py <папка с книгами> [<папка books>]
Имя файла без расширения = ключ книги.

- TXT: убираются мягкие переносы и книжные переносы строк внутри слов.
- EPUB: главы в порядке spine, HTML → текст.
- FB2: <body>, абзацы <p>, заголовки <title>.
- PDF: pdftotext; если текстового слоя нет или он битый (буквы разбиты
  пробелами, мало текста на страницу), книга не переводится и попадает
  в отчёт BAD.
"""
import html
import re
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


def clean(text: str) -> str:
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    text = text.replace(' ', ' ').replace('​', '')
    # мягкий перенос (с возможным переводом строки после него)
    text = re.sub('­[ \t]*\n?[ \t]*', '', text)
    # книжный перенос: «сово-\nкупности» → «совокупности» (только если дальше строчная)
    text = re.sub(r'([а-яёА-ЯЁ])-\n[ \t]*([а-яё])', r'\1\2', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip() + '\n'


def html_to_text(s: str) -> str:
    s = re.sub(r'(?is)<(script|style|head)[^>]*>.*?</\1>', ' ', s)
    s = re.sub(r'(?i)<br\s*/?>', '\n', s)
    s = re.sub(r'(?i)</(p|div|h[1-6]|li|tr|blockquote|section)>', '\n\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    return html.unescape(s)


def from_epub(p: Path) -> str:
    z = zipfile.ZipFile(p)
    cont = ET.fromstring(z.read('META-INF/container.xml'))
    opf_path = cont.find('.//{*}rootfile').get('full-path')
    opf = ET.fromstring(z.read(opf_path))
    base = opf_path.rsplit('/', 1)[0] + '/' if '/' in opf_path else ''
    items = {i.get('id'): i.get('href') for i in opf.iter('{*}item')}
    parts = []
    for ref in opf.iter('{*}itemref'):
        href = items.get(ref.get('idref'))
        if not href:
            continue
        try:
            parts.append(html_to_text(z.read(base + href).decode('utf-8', 'replace')))
        except KeyError:
            pass
    return '\n\n'.join(parts)


def from_fb2(p: Path) -> str:
    raw = p.read_bytes()
    if p.suffix == '.zip' or raw[:2] == b'PK':
        z = zipfile.ZipFile(p)
        raw = z.read([n for n in z.namelist() if n.endswith('.fb2')][0])
    root = ET.fromstring(raw)
    out = []
    for body in root.iter('{*}body'):
        for el in body.iter():
            tag = el.tag.split('}')[-1]
            if tag in ('p', 'v', 'subtitle', 'text-author'):
                out.append(''.join(el.itertext()))
            elif tag == 'empty-line':
                out.append('')
    return '\n'.join(out)


def from_pdf(p: Path):
    pages = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', str(p)], capture_output=True, text=True).stdout).group(1))
    text = subprocess.run(['pdftotext', str(p), '-'], capture_output=True, text=True).stdout
    letters = len(re.findall(r'[а-яёА-ЯЁa-zA-Z]', text))
    split_runs = len(re.findall(r'(?<!\S)[а-яё](?:\s[а-яё]){2,}(?!\S)', text))
    words = max(1, len(re.findall(r'[а-яё]+', text.lower())))
    problems = []
    if letters / max(1, pages) < 300:
        problems.append(f'мало текста: {letters // max(1, pages)} букв на страницу (нет текстового слоя?)')
    if split_runs / words > 0.005:
        problems.append(f'буквы разбиты пробелами: {split_runs} мест')
    return text, problems


def main():
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / 'books')
    dst.mkdir(exist_ok=True)
    bad = []
    for p in sorted(src.iterdir()):
        if p.name.startswith(('_', '.')) or not p.is_file():
            continue
        key, ext = p.stem.split('.')[0], p.suffix.lower()
        try:
            if ext == '.txt':
                text = p.read_text('utf-8', errors='replace')
            elif ext == '.epub':
                text = from_epub(p)
            elif ext in ('.fb2', '.zip'):
                text = from_fb2(p)
            elif ext == '.pdf':
                text, problems = from_pdf(p)
                if problems:
                    bad.append((p.name, '; '.join(problems)))
                    continue
            else:
                continue
        except Exception as e:  # noqa: BLE001
            bad.append((p.name, f'не удалось прочитать: {e}'))
            continue
        (dst / f'{key}.txt').write_text(clean(text), 'utf-8')
        print('ok ', key)
    for name, why in bad:
        print('BAD', name, '—', why)


if __name__ == '__main__':
    main()
