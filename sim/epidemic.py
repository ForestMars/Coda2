

incidence = '' # new cases per unit time
cumulative_prevalence = '' #

# most everything is a dependent var in epidemic modeling.

class Population(Object):
    def __init__():
        P = pop_number
        S = P - (E + I + V) #pop_susceptible
        E = I * B # pop_exposed
        I = E * IR # pop_infected
        V = R + D  = pop_recovered
        pop_lost
        pop_hospital

def i(N,I):
    return

def epi_curve(i, t):
  # i[t] = ( 1 + (1-i/i) * np.log(ETR * t) ) / 1)
  # in R: (1/(1+ (exp(-beta*t)*(1-a0)/a0)))
  a0 = .01
  beta = 0.1
  t = p.linspace(start=0, stop=100, num=1)

  pass

epi.curve = expression

plot(t,eval(epi.curve),type="l",col="blue",
xlab="Time", ylab="Cumulative Fraction Infected")


a <- eval(epi.curve)
b <- diff(a)
# plot(1:100,b,type="l",col="blue",
#xlab="Time", ylab="Incident Fraction Infected")
