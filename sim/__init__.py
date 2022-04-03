# sim/init.py - Load model assumptions, used to seed simulation runs.
# #Fixme: Ideally no values should be stored here, but only a json loader.

# Starting seeds
E0 = 1290
I0 = 1594
O0 = 2107
Q0 = 29895
H0 = 60
R0 = 456
D0 = 57

S0 = 0
H0 = 0
R0 = 0
Eq0 = 0
Sq0 = 0
N0 = 0
T0 = 0

P0 = 8000000

# Likewise, we can't we don't want the variables in the model's fundamental algorithm to have to be prefixed with a namespace.
# Maintaining clear separation between code and logic is seen in context
c = 2                   # Contact rate
BETA = 25                # Contact rate
iso_period = 1/14       # Isolation period
quar_period = 1/10      # Quarantine period
iso_rate_asym = 0.000001  # The isolation rate for asymptomatics
iso_rate_sym = 0.037   # The isolation rate for symptonatics
i_rate = 0.00000000205 # The infection rate of COVID-19
rec_rate = 0.014       # Recover rate without isolatation
rec_rate_iso = 0.07    # Recover rate with isolation.
CFR = 0.017        # https://www.cebm.net/covid-19/global-covid-19-case-fatality-rates/
symp_rate = 1/7         # Incuation rate = probablity that exposure leads to symptoms.
iso_s = 0.13    # Probability of symptoms given exposure, adjusted for quarantine.
R0 = 3.5 # Have to start somewhere.
P0 = 128932753  # Population of Mexico = 128,932,753
P_NYC = 8323338 # Population of NYC = 8,323,338


seeds = dict(
P = 8323338,
E = 1290,
I = 1594,
O = 2107,
Q = 29895,
H = 60,
R = 456,
D = 57,
)

parameters = dict(
c = 2,                  # Contact rate = Should be B for Beta
symp_rate = 1/7,        # Symptomatic rate = Probablity that exposure leads to symptoms.
i_rate = 0.00000000205, # Infection rate =
iso_period = 1/14,      # Isolation period =
quar_period = 1/10,     # Quarantine period =
iso_rate_sym = 0.037,   # The isolation rate for symptomatics
iso_rate_asym = 0.000001,  # The isolation rate for asymptomatics
iso_s = 0.13,           # Probability of symptoms given exposure, adjusted for quarantine.
CFR = 0.017,            # https://www.cebm.net/covid-19/global-covid-19-case-fatality-rates/
rec_rate = 0.014,       # Recover rate without isolatation
rec_rate_iso = 0.07,    # Recover rate with isolation.
sym_rate = 1/7,         # COPY of Symptomatic rate >>> NOT USED   # HHAHA double even
P0 = 128932753,         # Current population of Mexico = 128,932,753
P_NYC = 8323338,        # Current population of NYC = 8,323,338
)
