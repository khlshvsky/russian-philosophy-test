#!/usr/bin/env python3
"""Работа с книгой без чтения её целиком.

  python3 -I scripts/book.py toc  <ключ> [макс]          — похожие на заголовки строки с номерами
  python3 -I scripts/book.py grep <ключ> <regex> [окно]   — поиск (без учёта регистра и ё/е), окно символов вокруг
  python3 -I scripts/book.py show <ключ> <строка> [число] — строки книги
  python3 -I scripts/book.py q    <ключ> <цитата>         — есть ли цитата (с той же нормализацией, что в сборке)
"""
import re
import signal
signal.signal(signal.SIGPIPE, signal.SIG_DFL)
import sys
from pathlib import Path

BOOKS = Path(__file__).resolve().parent.parent / 'books'


def norm(s):
    s = s.lower().replace('́', '').replace('̀', '').replace('­', '').replace('ё', 'е')
    s = re.sub(r'[*_"“”„\'‘’«»‹›`]', '', s).replace('…', '...')
    s = re.sub(r'[-‐‑‒–—―]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def load(key):
    return (BOOKS / f'{key}.txt').read_text('utf-8').split('\n')


def main():
    cmd, key = sys.argv[1], sys.argv[2]
    lines = load(key)
    if cmd == 'toc':
        mx = int(sys.argv[3]) if len(sys.argv) > 3 else 300
        n = 0
        for i, l in enumerate(lines, 1):
            s = l.strip()
            if not s or len(s) > 90:
                continue
            if re.match(r'^(глава|часть|книга|чтение|лекция|письмо|статья|раздел|отдел|§|[IVXLC]+[.\s]|\d+[.)]\s|[А-ЯЁ][А-ЯЁ\s,.\-«»:]{6,}$)', s, re.I) or (s.isupper() and len(s) > 4):
                print(i, s)
                n += 1
                if n >= mx:
                    break
    elif cmd == 'grep':
        pat = re.compile(sys.argv[3].replace('е', '[её]'), re.I)
        win = int(sys.argv[4]) if len(sys.argv) > 4 else 160
        hits = 0
        for i, l in enumerate(lines, 1):
            for m in pat.finditer(l):
                a, b = max(0, m.start() - win), min(len(l), m.end() + win)
                print(f'{i}: …{l[a:b]}…')
                hits += 1
                if hits >= 40:
                    print('(показаны первые 40)')
                    return
    elif cmd == 'show':
        start = int(sys.argv[3])
        cnt = int(sys.argv[4]) if len(sys.argv) > 4 else 40
        for i in range(max(1, start), min(len(lines), start + cnt) + 1):
            print(i, lines[i - 1])
    elif cmd == 'q':
        text = norm('\n'.join(lines))
        q = norm(sys.argv[3])
        print('OK' if q in text else 'НЕТ', len(q.split()), 'слов')


if __name__ == '__main__':
    main()
