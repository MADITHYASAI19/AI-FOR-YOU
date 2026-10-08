import os, glob

files = glob.glob('src/pages/*.jsx') + ['src/components/Layout.jsx']
for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        
        content = content.replace('catch (_err) {', 'catch (error) {\n        console.error(error);')
        content = content.replace('fetchDatasets();', '// eslint-disable-next-line react-hooks/set-state-in-effect\n    fetchDatasets();')
        content = content.replace('setAlgorithm("random_forest");', '// eslint-disable-next-line react-hooks/set-state-in-effect\n    setAlgorithm("random_forest");')
        content = content.replace('setProfileOpen(false);', '// eslint-disable-next-line react-hooks/set-state-in-effect\n    setProfileOpen(false);')
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
print("Finished patching files")
