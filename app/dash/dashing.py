



class Traces():
    def __init__():
        fig = go.Figure()

    def add_traces(fig, traces: dict):
        for name, vector in traces:
            add_a_trace(fig, vector, name)
        return fig

    def add_a_trace(fig, y, name: str, mode: str):
        fig.fig.add_trace(go.Scatter(name=name, x=x, y=y, mode=mode))

    def add_markers():
        pass

    def add_lines():
        pass
