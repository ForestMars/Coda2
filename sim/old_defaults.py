

basic simulation
base_pop = '' (assumed stable for basic simulation)
infected_count = '' # Real world data point
projected_infected = '' # takes number of days to predict

First let's see if we can observe the effect of lockdown changing the slope of the infection rate.
In theory this is simply the effect of changing R0, so we can model it that way, although we don't actually know what R0 is for Covid.

Everyone in the given population group will fall into 1 of 5 at risk categories:
states:
susceptible
exposed:
infected: I0
recovered
lost

testing rate
NY - 32 per 10000
FL 12/1000
TX 6/1000

The probability that a susceptible and infectious individual meet is proportional to
their abundances, with effective transmission rate β
ETR (Beta) = ''

advanced simulation
def simulation_params():

base_pop = ''
pop_fert_rate = ''
pop_mort_rate = ''
pop_growth_rate = '' # (This is actually natural increase, not population growth.)

symptomatic_rate = ''
require_hospitalization_rate = ''
require_icu_rate = ''

patient_flow_capacity = ''
patient_arrival_rate = ''
patient_length_of_stay =
patient_icu_capacity = '' - this is a raw number not a rate

recovered_hospitalized = '' # >= recovered_icu_rate
recoveed_icu_rate = '' # <= recovered_hospitalized
