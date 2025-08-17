import os, sys

# edit your path below
sys.path.append("/home/henrikahlinder.helioho.st/httpdocs/Caaluza");

sys.path.insert(0, os.path.dirname(__file__))
from Controller import app as application

# set this to something harder to guess
application.secret_key = 'secret'
