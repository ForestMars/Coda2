# home.py - app module for Codato home page.
__version__ = '0.1'
__all__ = ['layout', 'callback']

import dash_core_components as dcc
import dash_html_components as html
from dash.dependencies import Input, Output

from assets import footer # app template is not self-closing (unless you really want to see that footer on your endless scroll?)

layout = html.Div([
    html.Br(),
    html.H3('Feature Inference'),
    dcc.Markdown('''Select from available fetures (which can be visually examined with the [explore](explore) app) or add a new feature of your own. Any Kafka datastream can be used as a real time data source for your feature. This is where you can idntify hetereoskedasticities between your features, which is crucial for holotropic analysis of its [fractal entropy gradient](http://fractalgradient.com) reduction, and distance beween features, which is crucial for time series prediction. Just as we perform Fourier analysis on a waveform to make predictions about what a person’s voice will sound like, or what they might actually be saying, similar Fourier analysis is done on the fractal entropy of each gradient as it is reduced using its Fourier-Garch representation (see [citations](readme.md#Resources).) '''),
    ],
    style={'padding':'10vw'}
    )

def callback(app):
    pass
