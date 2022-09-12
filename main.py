from genericpath import exists
import json
import logging

logging.basicConfig(filename="/tmp/shortcuts.log",
                    format='[Shortcuts] %(asctime)s %(levelname)s %(message)s',
                    filemode='w+',
                    force=True)
logger=logging.getLogger()
logger.setLevel(logging.INFO) # can be changed to logging.DEBUG for debugging issues

def Log(txt):
    logger.info(f"[Shorcuts] {txt}")

class Shortcut:
    def __init__(self, dict):
        self.name = dict.name
        self.icon = dict.icon
        self.path = dict.path
        self.id = dict.id

class Plugin:
    # Normal methods: can be called from JavaScript using call_plugin_function("signature", argument)
    async def getShortcuts(self):
        return self.shortcuts
        
    async def setShortcuts(self, data):
        await self._updateShortcuts(self, self.shortcutsPath, data)
        return self.shortcuts

    async def launchApp(self, name, path):
        Log(f"Launching {name}")
        
        pass

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        logger.info("Hello World!")
        
        self.shortcuts = {}
        self.shortcutsDevPath = "/home/deck/homebrew/plugins/Shortcuts/defaults/shortcuts.json"
        self.shortcutsPath = self.shortcutsDevPath # "/home/deck/homebrew/plugins/Shortcuts/shortcuts.json"

        await self._load(self)

        pass

    async def _load(self):
        await self._parseShortcuts(self, self.shortcutsPath)

        pass

    async def _parseShortcuts(self, path):
        Log("Analyzing Shortcuts JSON")
            
        if (exists(path)):
            try:
                with open(path, "r") as file:
                    shortcutsDict = json.load(file)
                    
                for itm in shortcutsDict.items():
                    if (itm.id not in [x.name for x in self.shortcuts.items()]):
                        self.shortcuts.append(Shortcut(itm))
                        Log(f"Adding shortcut {itm.name}")

            except Exception as e:
                Log(f"Exception while parsing shortcuts: {e}") # error reading json

        pass

    async def _updateShortcuts(self, path, data):
        jDat = json.dumps(data, indent=4)

        for itm in data.items():
            if (itm.id not in [x.name for x in self.shortcuts]):
                self.shortcuts[itm.id] = Shortcut(itm)
                Log(f"Adding shortcut {itm.name}")
        
        with open(path, "w") as outfile:
            outfile.write(jDat)
        
        return True
