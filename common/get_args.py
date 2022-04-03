#!/usr/bin/python3
# Arg parger for Covid Data Tools prediction module.
"""
    -h  show this help text
    -d  set the date range to display
    -t  set the range of dates to train on
"""

import argparse

def get_args():

    parser = argparse.ArgumentParser(
        description='Covid Data Tools - incidence prediction module',
        epilog = """Contribute on GitHub:"""
        )

    parser.add_argument('-D', '--load_defaults', action="store", dest='dates', default=None, help='load default settings', metavar='')
    parser.add_argument('-d', '--date_range', action="store", dest='dates', default=None, help='set the date range to display', metavar='')
    parser.add_argument('-p', '--predict', action="store", dest='dates', default=None, help='run predict module only', metavar='')
    parser.add_argument('-t', '--train_period', action="store", dest='train', default=None, help='set the range of dates to train on', metavar='')

    args = parser.parse_args()

    return args

# ???
if __name__ == '__main__':
    get_args()
