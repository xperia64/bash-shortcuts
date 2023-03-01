import { ServerAPI } from "decky-frontend-lib";
import { ShortcutsController } from "./ShortcutsController";
import { InstancesController } from "./InstancesController";
import { PyInterop } from "../../PyInterop";
import { SteamController } from "./SteamController";
import { Shortcut } from "../data-structures/Shortcut";
import { WebSocketClient } from "../../WebsocketClient";

/**
 * Main controller class for the plugin.
 */
export class PluginController {
  static mainAppId: number;

  // @ts-ignore
  private static server: ServerAPI;
  private static steamController: SteamController;
  private static shortcutsController: ShortcutsController;
  private static instancesController: InstancesController;
  private static webSocketClient: WebSocketClient;

  private static shortcutName: string;
  private static runnerPath = "\"/home/deck/homebrew/plugins/bash-shortcuts/shortcutsRunner.sh\"";
  private static startDir = "\"/home/deck/homebrew/plugins/bash-shortcuts/\"";

  /**
   * Sets the plugin's serverAPI.
   * @param server The serverAPI to use.
   */
  static setup(server: ServerAPI): void {
    this.server = server;
    this.steamController = new SteamController();
    this.shortcutsController = new ShortcutsController(this.steamController);
    this.webSocketClient = new WebSocketClient("localhost", "5000");
    this.instancesController = new InstancesController(this.shortcutsController, this.webSocketClient);
  }

  /**
   * Sets the plugin to initialize once the user logs in.
   * @returns The unregister function for the login hook.
   */
  static initOnLogin(): Unregisterer {
    PyInterop.getHomeDir().then((res) => {
      PluginController.runnerPath = `\"/home/${res.result}/homebrew/plugins/bash-shortcuts/shortcutsRunner.sh\"`;
      PluginController.startDir = `\"/home/${res.result}/homebrew/plugins/bash-shortcuts/\"`;
    });

    return this.steamController.registerForAuthStateChange(async () => {
      if (await this.steamController.waitForServicesToInitialize()) {
        PluginController.init("Bash Shortcuts");
      } else {
        PyInterop.toast("Error", "Failed to initialize, try restarting.");
      }
    }, null, true);
  }

  /**
   * Initializes the Plugin.
   * @param name The name of the main shortcut.
   */
  static async init(name: string): Promise<void> {
    this.shortcutName = name;

    //* clean out all shortcuts with names that start with "Bash Shortcuts - Instance"
    const oldInstances = (await this.shortcutsController.getShortcuts()).filter((shortcut:SteamAppDetails) => shortcut.strDisplayName.startsWith("Bash Shortcuts - Instance"));

    if (oldInstances.length > 0) {
      for (const instance of oldInstances) {
        await this.shortcutsController.removeShortcutById(instance.unAppID);
      }
    }

    this.webSocketClient.connect();
  }

  /**
   * Launches a steam shortcut.
   * @param shortcutName The name of the steam shortcut to launch.
   * @param shortcut The shortcut to launch.
   * @param runnerPath The runner path for the shortcut.
   * @param onExit An optional function to run when the instance closes.
   * @returns A promise resolving to true if the shortcut was successfully launched.
   */
  static async launchShortcut(shortcut: Shortcut, onExit: (data?: LifetimeNotification) => void = () => {}): Promise<boolean> {
    const createdInstance = await this.instancesController.createInstance(PluginController.shortcutName, shortcut, PluginController.runnerPath, PluginController.startDir);
    if (createdInstance) {
      PyInterop.log(`Created Instance for shortcut ${shortcut.name}`);
      return await this.instancesController.launchInstance(shortcut.id, onExit);
    } else {
      return false;
    }
  }

  /**
   * Closes a running shortcut.
   * @param shortcut The shortcut to close.
   * @returns A promise resolving to true if the shortcut was successfully closed.
   */
  static async closeShortcut(shortcut:Shortcut): Promise<boolean> {
    const stoppedInstance = await this.instancesController.stopInstance(shortcut.id);
    if (stoppedInstance) {
      PyInterop.log(`Stopped Instance for shortcut ${shortcut.name}`);
      return await this.instancesController.killInstance(shortcut.id);
    } else {
      PyInterop.log(`Failed to stop instance for shortcut ${shortcut.name}. Id: ${shortcut.id}`)
      return false;
    }
  }

  /**
   * Kills a shortcut's instance.
   * @param shortcut The shortcut to kill.
   * @returns A promise resolving to true if the shortcut's instance was successfully killed.
   */
  static async killShortcut(shortcut: Shortcut): Promise<boolean> {
    return await this.instancesController.killInstance(shortcut.id);
  }

  /**
   * Checks if a shortcut is running.
   * @param shorcut The shortcut to check for.
   * @returns True if the shortcut is running.
   */
  static checkIfRunning(shorcut: Shortcut): boolean {
    return Object.keys(PluginController.instancesController.instances).includes(shorcut.id);
  }

  /**
   * Registers a callback to run when WebSocket messages of a given type are recieved.
   * @param type The type of message to register for.
   * @param callback The callback to run.
   */
  static onWebSocketEvent(type: string, callback: (data: any) => void) {
    this.webSocketClient.on(type, callback);
  }

  /**
   * Function to run when the plugin dismounts.
   */
  static onDismount(): void {
    this.shortcutsController.onDismount();
    this.webSocketClient.disconnect();
  }
}