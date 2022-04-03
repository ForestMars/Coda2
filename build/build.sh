# Coda.to - Build script for compiling models and NLP module. 

# Compile Fit model
#gcc fit.o -shared -o lib/src/fit.so

# Compile NLP for question answering
gcc qa.o -shared -o lib/src/qa.so

# Compile SEIR+ model
gcc SEIR.o -shared -o lib/models/SEIR.so

