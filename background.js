"use strict"

const CONTAINER_NAME = "Parallel Queue Container"
const configuration = {}
resetConfiguration()

function resetConfiguration () {
  configuration.tabsNumber = 0
  configuration.tabUrl = ""
  configuration.tabDelay = 0
  configuration.siteDelay = 0
  configuration.closeTabs = false
  configuration.done = true
}

function sleep (ms) {
  return new Promise((resolve, _) => {
    setTimeout(resolve, ms)
  })
}

async function getContexts (contextName, tabsNumber = null) {
  // query existing contexts
  const contexts = await browser.contextualIdentities.query({ name: contextName })

  if (tabsNumber !== null) {
    // create more contexts, if needed
    for (let i = contexts.length; i < tabsNumber; i++) {
      const contextualIdentity = await browser.contextualIdentities.create({ name: contextName, color: "purple", icon: "cart" })
      contexts.push(contextualIdentity)
    }

    // remove unwanted contexts, if needed
    while (contexts.length > tabsNumber) {
      const context = contexts.pop()
      await browser.contextualIdentities.remove(context.cookieStoreId)
    }
  }

  return contexts
}

async function onTabUpdate (tabId, changeInfo) {
  // reached destination url, after queue [not exact match, just starting with]
  if (changeInfo?.url.indexOf(configuration.tabUrl) === 0) {
    // stop watching tabs changes
    browser.tabs.onUpdated.removeListener(onTabUpdate)

    if (!configuration.done) {
      // select this tab
      browser.tabs.update(tabId, { active: true })
      // close other tabs, keep tabId
      if (configuration.closeTabs) {
        closeTabs(tabId)
      }
      // reset configuration
      resetConfiguration()
    }
  }
}

async function closeTabs (keepTabId) {
  const contexts = await getContexts(CONTAINER_NAME)
  const tabIds = []

  for (const context of contexts) {
    const tabs = await browser.tabs.query({ cookieStoreId: context.cookieStoreId })

    for (const tab of tabs) {
      if (tab.id !== keepTabId) {
        tabIds.push(tab.id)
      }
    }
  }

  await browser.tabs.remove(tabIds)
}

async function run (tabsNumber, tabUrl, tabDelay, siteDelay, closeTabs) {
  // allow running (again) only if previously done
  if (!configuration.done) {
    return
  }

  configuration.tabsNumber = tabsNumber
  configuration.tabUrl = tabUrl
  configuration.tabDelay = tabDelay
  configuration.siteDelay = siteDelay
  configuration.closeTabs = closeTabs
  configuration.done = false

  const contexts = await getContexts(CONTAINER_NAME, configuration.tabsNumber)

  // check if a tab owned by us is already present
  for (const context of contexts) {
    const tabs = await browser.tabs.query({ cookieStoreId: context.cookieStoreId })

    if (tabs.length > 0) {
      // reset configuration
      resetConfiguration()
      return
    }
  }

  for (const context of contexts) {
    if (configuration.done) {
      break
    }

    const tab = await browser.tabs.create({
      cookieStoreId: context.cookieStoreId,
      url: tabUrl,
      active: false
    })

    // watch for url changes
    browser.tabs.onUpdated.addListener(onTabUpdate, { properties: ["url"], tabId: tab.id })

    // delay tab opening
    await sleep(tabDelay)
  }
}

browser.webRequest.onBeforeRequest.addListener(
  async requestDetails => {
    if (requestDetails.url.indexOf(configuration.tabUrl) === 0) {
      // delay request acceptance
      await sleep(configuration.siteDelay)
    }

    // BlockingResponse (empty)
    return {}
  },
  { urls: ["<all_urls>"] },
  ["blocking"])