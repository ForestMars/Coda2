# styling sure is messy.

styleplot=dict(
    size=12,
    color='lightgray',
    opacity=0.8,
    line=dict(color='gray',width=2),
    )
style = {
    'red' : {'line': {'color': 'crimson', 'width': 2}},
    'green' : {'line': {'color': 'forestgreen', 'width': 2}},
    'blue' : {'line': {'color': 'LightSteelBlue', 'width': 2}},
    }
styleplot_red = {**styleplot, **style['red']}
styleplot_green =  {**styleplot, **style['green']}
styleplot_blue = {**styleplot, **style['blue']}
