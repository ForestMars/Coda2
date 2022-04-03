# lib/model/seir.py -  SEIR epidemiological model base classes.
__version__ = '0.1'
__all__ = ['Params', 'SEIR', 'time_stepper', 'social_distancing']
import numpy as np
import matplotlib.pyplot as plt

N0 = 127749000
EPOCHS = 30 # Epochs, was t_max = 100
t_max = EPOCHS

R0 = 3.5

"""
# old defaults
dt = .1
t = np.linspace(0, t_max, int(t_max/dt) + 1)
N = 10000
init_vals = 1 - 1/N, 1/N, 0, 0
alpha = 0.2
beta = 1.75
gamma = 0.5
params = alpha, beta, gamma

"""
params = {
    'N': "Population Number",
    'S': "Susceptible",
    'E': "Exposed (Infected, in Incubation period)", # In this model, Exposed includes incubation period, per notes.
    'I': "Infected with symptons",
    'R': "Recovered",
    'H': "Hospitalised",
    'D': "Died",
    'I': "Isolation",
    'Q': "Quarantine",
    'T': "Tested",
    'Neg': "Negative Test Result",
}

for param, what in params.items():
    exec(param + ' = np.zeros(EPOCHS)')

# Default Assumptions (loaded from defaults.py)
c = 2           #The contact rate
v = 1/14        #The rate of releasing form being isolated
iso = 0.000001  #The isolation rate of people who didn't have infection symptons
iso_i = 0.037   #The isolation rate of people who already have infection symptons
b = 0.00000000205 #The infection rate of COVID-19
r = 0.014       #The cure rate of people who are not isolated
iso_r = 0.07    #The cure rate of people who were isolated already
d = 0.00027     #The death rate
s = 1/7         #The possibility of people geting infection symptoms during incubation period who haven't been isolated
iso_s = 0.13    #The possibility of people geting infection symptoms during incubation period who haven been isolated


# have to use exec here.




N[0] = N0
E[0] = 1290
S[0] = N[0] - E[0] - I[0] - R[0] - D[0] - Q[0] -I[0]
I[0] = 1594
I[0] = 2107
Q[0] = 29895
H[0] = 60
R[0] = 456
D[0] = 57



class Params(object):
    """ Coefficients for Incubation, Contact & Spread """

    def __init__(self):
        pass

    @staticmethod
    def alpha():
        """ α = 0.2 """ #  C19 incubation estimated at 5 days
        """ Incubation coeffcient; inverse of the incubation period.
            change to Susceptible/s as Infected grows/decats times Contact Rate """
        ALPHA = 0.2
        return ALPHA

    @staticmethod
    def beta():
        """ β = R0 x 1/I === ( R0 = β x I ) -> [ I ( β / R0 ) = 1 ] ??
            Contact rate; average number of other persons an individual has contact with (?) """
        BETA = R0 * 1/I
        return BETA

    @staticmethod
    def gamma():
        """ γ = 0.5 """ # inverse of the mean infectious period (1/t_infectious)
        """ infected growth/decay based on infection period
            higher = quicker recovery/not (but these are not always equivalent) """
        GAMMA = 0.5
        return GAMMA


class SEIR(object):
    """ Seeded with starting parameters (begging the question, where did *they* get their starting parameters from?
        Turns out, everything's a rabbit hole. """

    N[0] = N0
    E[0] = 1290
    S[0] = N[0] - E[0] - I[0] - R[0] - D[0] - Q[0] -I[0]
    I[0] = 1594
    I[0] = 2107
    Q[0] = 29895
    H[0] = 60
    R[0] = 456
    D[0] = 57

    def __init__(self):
        # = getattr(ABG, abd.lower) for abg in params
        #S = self.Susceptible()
        #E = self.Exposed()
        #I = self.Infected()
        #R = self.Recovered()

        ALPHA = 0.2
        BETA = 'ok' # R0 * 1/I
        GAMMA = 0.5

    def Susceptible(self):
        """ DS = -β * S * I """ # Suceptable is function of Infected x Contact coefficient (rate)
        """ DS = -BETA * S * I """ # Suceptable is function of Infected x Contact coefficient (rate)
        S_0 = 1 - 1/10000

    def Exposed(self, ALPHA, BETA):
        """ DE = (β * S * I) - (α * E) """
        #DE = (BETA * S * I) - (ALPHA * E) #
        #DE = (Params.beta() * S * I) - (Params.alpha() * E) #
        DE = (BETA * S * I) - (ALPHA * E) #
        E_0 = 1/10000

    def Infected(self, ALPHA, GAMMA):
        """ DI = (α * E) - (γ * I) """
        #DI = (Params.alpha() * E) - (Params.gamma() * I) #
        DI = (ALPHA * E) - (GAMMA * I) #
        I_0 = 0

    def Recovered(self):
        """ DR = γ * I """
        #DR = Params.gamma() * I #
        DR = GAMMA * I #
        R_0 = 0

    def get_r0(self):
        """ R0 = β/γ = 3.5 (est.) """
        #r0 = Params.beta()/Params.gamma() # = 3.5
        r0 = BETA/GAMMA # = 3.5

    def base_seir_model(self, init_vals, params, t):  # Cythnise
        S_0, E_0, I_0, R_0 = init_vals
        S, E, I, R = [S_0], [E_0], [I_0], [R_0]
        params = [ Params.alpha(), Params.beta(), Params.gamma() ]
        dt = t[1] - t[0]
        for _ in t[1:]:
            next_S = S[-1] - (beta*S[-1]*I[-1])*dt
            next_E = E[-1] + (beta*S[-1]*I[-1] - alpha*E[-1])*dt
            next_I = I[-1] + (alpha*E[-1] - gamma*I[-1])*dt
            next_R = R[-1] + (gamma*I[-1])*dt
            S.append(next_S)
            E.append(next_E)
            I.append(next_I)
            R.append(next_R)
        return np.stack([S, E, I, R]).T

    def social_seir_model(self, epoch): #Cytnonise
        for i in range(1,epoch):
            dS = v*Q[i-1] - (I[i-1]+E[i-1])*S[i-1]*c*(iso*(1-b) + b)
            S[i] = S[i-1] + dS
            dE = b*(I[i-1]+E[i-1])*S[i-1]*(1-iso)*c -E[i-1]*s - r*E[i-1]
            E[i] = E[i-1] + dE
            dI = E[i-1]*s - I[i-1]*iso_i - I[i-1]*r - I[i-1]*d
            I[i] = I[i-1] + dI
            dR = I[i-1]*r + r*E[i-1] + H[i-1]*iso_r + I[i-1]*iso_r
            R[i] = R[i-1] + dR
            dQ = (I[i-1]+E[i-1])*S[i-1]*c*iso*(1-b) - v*Q[i-1]
            Q[i] = Q[i-1] + dQ
            dI = (I[i-1]+E[i-1])*b*c*iso*S[i-1] - I[i-1]*iso_s - I[i-1]*iso_r
            I[i] = I[i-1] + dI
            dH = I[i-1]*iso_s + I[i-1]*iso_i - H[i-1]*d - H[i-1]*iso_r
            H[i] = H[i-1] + dH
            dD = H[i-1]*d + I[i-1]*d
            D[i] = D[i-1] + dD
            N[i] = S[i] + E[i] + I[i] + R[i] + D[i] + I[i] + Q[i]


# Let's use 'w' for our social distancing parameter, for Wojak, the "feels" guy.
def social_distancing(β,w):
    """ indirectly exposure value in this model via the average contact number. """
    """ How many have been exposed to the disease: grows based on contact rate; decreases based on incubation period """


def time_stepper(EPOCHS, model):
    for e in range(1, EPOCHS):
        getattr(MODELS, model)(e)

MODELS = SEIR()  # (Import SEIR.models)
model = 'social_seir_model'

time_stepper(EPOCHS, model)


def draw_plot(EPOCHS): # temp for quick peeks.
    fig, axs = plt.subplots()
    grid = plt.GridSpec(2, 2)
    ax = plt.subplot(grid[:])
    e = np.arange(0, EPOCHS)

    # ax.plot(e, S, color = 'orange', linewidth = 2, label = "E = Patients Exposed (incubating)")
    ax.plot(e, E+I, color = 'orange', linewidth = 2, label = "E = Patients Exposed (Incubation)")
    ax.plot(e, I, color = 'crimson', linewidth = 2, label = "I = Infected Patients (Symptomatic)")
    ax.plot(e, D, color = 'black', linewidth = 2, label = "R = Removed (not Recovered)")
    ax.plot(e, H, color = 'forestgreen', linewidth = 2, label = "H = Hospitalisaton rate")
    ax.set_xlim([0, 30])
    ax.grid()

    ax.set(title="SEIR Model: Projected results based on model assumptions and number of days",
        xlabel='Days since Patient Zero', ylabel='Number in Affected State',
        )
    ax.legend(loc='upper left', fontsize=13)

    fig.savefig("seir.png")
    plt.show()



draw_plot(EPOCHS)


#if __name__ == '__main__':
#    results = base_seir_model(init_vals, params, t) # runs simulation
