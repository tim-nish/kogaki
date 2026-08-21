# Fixture: a pointer past the end of its file

Constructs kogaki#583's resolves-nowhere class: the file is real, the line is
not. The resolver must refuse this pointer by name.

The registry's admission contract is stated at checks/registry.json:99999.
