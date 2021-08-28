"use strict"

const background = browser.extension.getBackgroundPage()
const settingsForm = document.querySelector("#settings")

settingsForm.addEventListener("submit", async e => {
  e.preventDefault()

  // get form data
  const formData = new FormData(settingsForm)
  const tabsNumber = +formData.get("tabs-number")
  const tabUrl = formData.get("tab-url")
  const tabDelay = +formData.get("tab-delay") * 1000
  const siteDelay = +formData.get("site-delay") * 1000
  const closeTabs = !!formData.get("tabs-close")

  await background.run(tabsNumber, tabUrl, tabDelay, siteDelay, closeTabs)
})