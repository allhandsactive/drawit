'''
Automatically generated launcher to launch axidraw_control.
This launcher is used for scripts that are built via pyinstaller (e.g. axidraw_control.py, axidraw_naming.py).
To regenerate, run python bin/generatewrappers.py
'''
import subprocess
import sys
import inkex

command = ['./build_deps/axidraw_control'] + sys.argv[1:]
proc = subprocess.run(command, capture_output=True, text=True)

# print error messages, if there are any
if proc.stderr != "":
  inkex.errormsg(proc.stderr)

# inkscape parses stdout for the result of an extension
print(proc.stdout)
