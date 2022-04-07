""" Move into terms.py """
## load this from somewhere else please.
# need to dinstingush "went to the hspital" and "released from the hospital"
C19 = ['c19', 'covid', 'covid19', 'covid-19', 'coronavirus', 'sars-cov-2']
STATS = ['cases', 'confirmed', 'positive', 'negative', 'deaths', 'died', 'hospitalized', 'hospital', 'recovered', 'recperated', 'treated', 'cured']
stats_NNS = ['cases', 'confirmed', 'positive', 'negative', 'deaths', 'died', 'hospitalized', 'hospital', 'recovered', 'recperated', 'treated', 'cured']
stats_VBN = ['cases', 'confirmed', 'positive', 'negative', 'deaths', 'died', 'hospitalized', 'hospital', 'recovered', 'recperated', 'treated', 'cured']
symtomatic = ['had symptoms', 'showed symptoms', 'presented as', 'have symptoms', 'show symptoms']

death_stats = set(['dead', 'deaths', 'died', 'killed', 'lost their life', 'lost their lives', 'passed away' ])
hospital_stats = set(['hospitalized', 'hospitalised'])
case_stats = set(['cases', 'confirmed', 'positive', 'had covid', "had coronavirus", 'had corona', 'have covid', 'have coronavirus'])

future = ['will get', 'will ADV get']
other_examples = [
    'How many states are currently on lockdown',
    'Which state had the most cases in April?',
    'What country had more cases in March, Italy or Spain?',
    ]
MONTHS = [
'January',
'February',
'March',
'April',
'May',
'June',
'July',
'August',
'September',
'October',
'November',
'December',
]

MONTH_ABRVS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dev']
DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
DAYS_OF_WEEK_ABBR = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat']
