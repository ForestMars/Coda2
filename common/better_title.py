# better_title.py - extend builtin strings for a better title casing method.
import builtins
from random import shuffle

stop_words = ['a', 'after', 'along', 'an', 'and', 'around', 'at', 'be', 'because', 'but', 'by', 'can', 'do', 'for', 'from', 'how', 'if', 'go', 'nor', 'of', 'on', 'so', 'than', 'that', 'the', 'then', 'to', 'when', 'where', 'whether', 'while', 'who', 'why', 'with', 'yet'
]

def better_title(title):
    new_title = []
    s = ' '
    for word in title.split():
        if word.lower() in stop_words:
            word = word.lower()
        new_title.append(word)
    return s.join(new_title)

"""
class better__str(str):

    def ignore_stop_words(self, title, stop_words=stop_words):
        if self:
            words = title.split()
            check = stop_words.split()
            for x in range(len(words)):
                words[x] = words[x].lower()
                g = ord(words[x][0]) - 32
                words[x][0] = chr(g)
        return words
        else:
            return ''

    def typoglycaemia(self):
        if self:
            return self[0] + shuffle(self[1:-1]) + self[-1]
        else:
            return ''

builtins.str = better_str
"""

"""
stop_words = [
a,
after,
along,
an,
and,
around,
at,
be,
because
but,
by
can,
do,
for,
from,
how,
if,
go,
nor,
of,
on,
so,
than,
that,
the,
then,
to,
when,
where,
whether,
while,
who,
why,
with,
yet
]
"""
