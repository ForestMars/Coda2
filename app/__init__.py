# In case you're wondering...
__version__ = '0.0'

import dash


app = dash.Dash(__name__)
server = app.server
app.config.suppress_callback_exceptions = True
