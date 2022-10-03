import { Router, ServerAPI } from "decky-frontend-lib";
import { ReactElement } from "react";
import { Shortcut } from "./data-structures/Shortcut";
import { SteamShortcut } from "./SteamClient";
import { SteamUtils } from "./SteamUtils";


export class ShortcutManager {
    static server:ServerAPI;

    static shortcutName:string;
    static runnerPath = "/home/deck/homebrew/plugins/Shortcuts/shortcutsRunner.sh";
    static appId:number;

    private static routePath = "/library/app/:appid";
    private static routerPatch:any;

    static setServer(server:ServerAPI) {
        this.server = server;
    }

    static async init(name:string) {
        this.shortcutName = name;
        if (!(await this.checkShortcutExist(this.shortcutName))) {
            const success = await this.addShortcut(this.shortcutName, this.runnerPath);

            if (!success) console.log("Adding runner shortcut failed");
        } else {
            const shorcut = await SteamUtils.getShortcut(name) as SteamShortcut;
            this.appId = shorcut.appid;
        }

        if (this.appId) {
            console.log("appId initialized")
            this.routerPatch = this.server.routerHook.addPatch(this.routePath, (routeProps: { path: string; children: ReactElement }) => {
                console.log("patching");
                if (routeProps.path.includes(`${this.appId}`)) {
                    Router.Navigate("/library/home");
                    return null;
                }
                return routeProps;
            });
        }
    }

    static onDismount() {
        this.server.routerHook.removePatch(this.routePath, this.routerPatch);
    }

    static async getShortcuts() {
        const res = await SteamUtils.getShortcuts();
        console.log(res);
    }

    private static async checkShortcutExist(name:string): Promise<boolean> {
        return !!(await SteamUtils.getShortcut(name));
    }

    private static async addShortcut(name:string, exec:string): Promise<boolean> {
        const res = await SteamUtils.addShortcut(name, exec);
        if (res) {
            this.appId = res as number;
            return true; 
        } else {
            return false;
        }
    }

    private static async removeShortcut(name:string): Promise<boolean> {
        const shortcut = await SteamUtils.getShortcut(name);
        if (shortcut) {
            return !!(await SteamUtils.removeShortcut(shortcut.appid));
        } else {
            return false;
        }
    }

    static async launchShortcut(shortcut:Shortcut, name = this.shortcutName): Promise<boolean> {
        const steamShort = await SteamUtils.getShortcut(name);
        if (steamShort) {
            const didSetLaunchOpts = await SteamUtils.setAppLaunchOptions((steamShort as SteamShortcut).appid, shortcut.cmd); 
            if (didSetLaunchOpts) {
                Router.CloseSideMenus();
                const didLaunch = await SteamUtils.runGame(steamShort.appid, false);
                return didLaunch;
            } else {
                console.log("Failed at setAppLaunchOptions");
                return false;
            }
        } else {
            console.log("Failed at getShortcut");
            return false;
        }
    }
}