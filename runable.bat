FOR %%f IN (Statistical/*.txt) DO del "Statistical\%%f" /F /Q
FOR %%f IN (input/*.txt) DO node main.js "input/%%f" -html
FOR %%f IN (input/*.txt) DO node main.js "input/%%f" -html -k 3
FOR %%f IN (input/*.txt) DO node main.js "input/%%f" -html -a 4
FOR %%f IN (input/*.txt) DO node main.js "input/%%f" -html -r
GenerateExcel.exe
