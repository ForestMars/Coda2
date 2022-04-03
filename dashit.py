#!/usr/bin/python
# WIP vrsion of dash plot module
__version__ = '0.1'
__all__ = []

import sys

from plotly import graph_objs as go
import plotly.express as px
import dash
import dash_core_components as dcc
import dash_html_components as html

from lib.fit import *
from common.logger import Log as log
from assets.style import * # @FIXME



fig = go.Figure() # or any Plotly Express function e.g. px.bar(...)

def reset_colors():
    global n1
    global n2
    n1 = n2 = 0
reset_colors()

colors = ['darkred', 'darkmagenta', 'darkolivegreen',
         'darkorange','darkorchid', 'darkseagreen',
          'darksalmon',
          'darkslateblue', 'crimson', 'antiquewhite',
          'aqua', 'aquamarine', 'azure',
          'beige', 'bisque', 'blanchedalmond',
          'blue','blueviolet', 'brown',
          'burlywood', 'cadetblue', 'chartreuse',
          'chocolate', 'coral']


# This should be a class, obvi.
def dash_trace(x, y):
    fig=go.Figure()  # this is what redraws, see?
    fig.add_trace(go.Scatter(name='Actual cases', x=x, y=y, mode='markers', marker=styleplot_red))

    return fig


def add_trace_dots(fig, feature, x, fit):
    global n1
    if feature == 'confirmed':
        return fig# feature = 'cases' # Yes, we love having to use 2 lines for this, don't we.
    name = feature + " (actual)"
    fig.add_trace(go.Scatter(name=name, x=x, y=fit, mode='markers', marker=dict(color=colors[n1]),
    ))
    n1 += 1 # colors
    return fig


def add_trace_line(fig, feature, x, fit):
    global n2
    if feature == 'positive':
        feature = 'cases' # Yes, we love having to use 2 lines for this, don't we.
    name = feature + " (projected)"

    fig.add_trace(go.Scatter(name=name, x=x, y=fit, mode='lines', line=dict(color=colors[n2])))

    n2 += 1 # colors
    return fig


def add_trace(fig, feature, x, fit):
    if feature == 'positive':
        feature = 'cases' # Yes, we love having to use 2 lines for this, don't we.
    name = feature + " (projected)"
    fig.add_trace(go.Scatter(name=name, x=x, y=fit, mode='lines'))

    return fig

def add_distancing_data(fig, feature, x, fit):

    fig.add_trace(go.Scatter(name=feature, x=x, y=fit, mode='lines'))

    return fig



def dash_plot(fig):
    app.run_server(debug=True, use_reloader=False)
