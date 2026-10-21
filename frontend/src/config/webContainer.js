import { WebContainer } from "@webcontainer/api";

let webContainerInstance = null;

export async function getWebContainer() {
    if (webContainerInstance) {
        return webContainerInstance;
    }

    webContainerInstance = await WebContainer.boot();

    console.log("WebContainer booted successfully!");

    return webContainerInstance;
}