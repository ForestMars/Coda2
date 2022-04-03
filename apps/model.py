# apps/model.py - Pluggable Dataviz module to run and plot a model.
breakpoint()
__vers__ = '0.1'
__all__ = ['layout', ]

import builtins # This looks dirtier than it really is.
import numpy as np

import dash_table
import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output
import plotly.graph_objs as go
import pandas as pd

from app import app
from assets import menu
from assets import footer
from lib.components import single_region_dropdown

# @FIXME: WTF
#from lib.models.SEIR import SEIR_Model # Load our SEIR model incl. all variables.
from build.src.SEIR import SEIR_Model

## Declarations

EPOCHS = 32 # Not really epochs, but what's in a name.

# Spot the problem.
TRACES = dict(
    #Susceptible = ('S', 'orange'),
    Exposed = ('E', 'orange'),
    Infected = ('I', 'crimson'),
    Recovered = ('R', 'blue'),
    Hospitalised = ('H', 'lawngreen'),
    Deaths = ('D', 'black'),
)

seedz = dict(
P = 8323338,
E = 1290,
I = 1594,
O = 2107,
Q = 29895,
H = 60,
R = 456,
D = 57,
)

## Here is where we would load our default model assumptions, which are really assumptions about the datast. Which is why they are not included in the model class.
# Currently however, the model class loads a config file that holds the starting assumptions.

# This should be loaded from the default copy object, not hardcoded here.
texty = 'Basing initial outbreak on New York size population of 8 million. Or select alternate geographic region using selector below. SEIR model directly callable through API. (See API documentation for details.) Define a model and run on real data.'


## Layout

# which reminds me, really need to comepltely redo all layouts :-/
layout = html.Div([
    html.H3('SEIR Model (SEIR-RHIQ Model)',
        style={'padding-top':'2vw', 'margin-top':0}),
    html.P(texty,
        style={'text-align':'left', 'padding':'3vw'}
        ),
    dcc.Graph(
        id='model_',
        config={'displayModeBar': False}
        ),
    html.Div([ ], # remoeved
        id='controls',
        style={'padding-top':'5vw', 'text-align':'center', 'background-color':'#'}
        ),
    html.Div([ # left/right container
        html.Div(['',
            html.H4("Model Starting Values"),
            html.P("Adjust parameter, download current model assumotions, or upload fully parameterised model. Click on any number to change and re-run model with the updated value.",
                style={'text-align':'left'}
                ),
            html.Div(id='seed_table', style={'width':'25%', 'margin':'auto'}),
            ],
            id="left-selectors",
            style={'width':'50%', 'float':'left', 'padding':'1vw', 'text-align':'center',
            'margin':'auto', 'backgroundColor': '#'},
            ),
        html.Div(['',
            html.H4("Model Assumptions"),
            html.P("Adjust parameter, download current model assumotions, or upload fully parameterised model. Click on any number to change and re-run model with the updated value.",
                style={'text-align':'left'}
                ),
            html.Div(id='assumptions_table', style={'width':'25%', 'margin':'auto', 'background-color':'#'}),
            ],
            id="right-se#lectors",
            style={'width':'50%', 'padding':'1vw', 'float':'left', 'text-align':"center"},
            ),
        ],
        id="selector-cols",
        style={'text-align':"center"},
        ),

    html.Br(),
    html.Div(single_region_dropdown,
        style={
            'width':'25%', 'margin':'auto', 'background-color':'#',
            'text-alilgn':'center', 'padding-top':'55px', 'margin-top': '33px', 'clear':'both'}
            ),
    html.Hr(),
    footer.get_footer_links(),
    footer.get_footer_tos(),

    ],
    id='divitis',
    style={'text-align':'center', 'background-color':'#828c13'}
)


## Definitions - NB. how model assumptions are loaded twice. Beats injecting a parameterised object into our model class, tho.

def _generate_table(df):
    return dash_table.DataTable(
        #id='table',
        #columns=[{"name": i, "id": i} for i in df.columns],
        columns=[{"name": i, "id": i} for i in df.columns],
        data=df.to_dict('records'), # why are we passing in dict, then?
        editable=True, # This should only be true is edit param in get request is "True"
        style_as_list_view=True,
        sort_action='native',
        style_header={
            'backgroundColor': '#990',
            'fontWeight': 'bold',
            },
        style_cell={
            'backgroundColor': '#828c13',
            'color': '#111',
            'border':  '1px solid #443',
            },
        )

def time_stepper(EPOCHS, model):
    for e in range(1, EPOCHS):
        print(e)
        getattr(SEIR, model)(e)
        print(getattr(SEIR, model)(e))
    # Get results after time stepping:
    return SEIR.get_seird()

# Plotting function should be imported and shared with other apps.
def do_traces(predict:dict, traces:dict):
    fig = go.Figure()
    for name, trace in TRACES.items():
        vector = predict[trace[0]]
        color = trace[1]
        fig.add_trace(
            go.Scatter(name=name, x=e, y=vector, mode='lines', marker=dict(color=color))
            )
    return fig

def update_plot():
    #ax.set_xlim([0, 30])
    pass


## Initialize -  Which model to load? Cythonised models are found in lib.models.

SEIR = SEIR_Model()
model = 'social_seir_model' # included parameters for social distancing.
e = np.arange(0, EPOCHS)
predict = time_stepper(EPOCHS, model)


## Callbacks - Self-explanatory, haha.

def callback(app):
    @app.callback(Output('model_', 'figure'),
        [Input('single_region_dropdown', 'value'),
        ])
    def update_graph_scatter(region):
        #fig = get_fig(e)
        fig = do_traces(predict, TRACES)
        fig.update_layout(
            plot_bgcolor='#828c13',
            paper_bgcolor='#828c13'
            )
        return fig

    @app.callback(Output('seed_table', 'children'),
        [Input('single_region_dropdown', 'value'),
        ])
    def update_seeds(input):
        df = pd.DataFrame(seedz.items())
        df.columns = ['seed', 'value']
        return _generate_table(df)

    @app.callback(Output('assumptions_table', 'children'),
        [Input('single_region_dropdown', 'value'),
        ])
    def update_seeds(input):
        df = pd.DataFrame(seedz.items())
        df.columns = ['param', 'value']
        return _generate_table(df)
