import { Remarkable } from "remarkable";

import hljs from "highlight.js/lib/highlight";
import haskellSupport from "highlight.js/lib/languages/haskell";
import javascriptSupport from "highlight.js/lib/languages/javascript";

import regeneratorRuntime from "regenerator-runtime";

(async function () {
  hljs.registerLanguage("haskell", haskellSupport);
  hljs.registerLanguage("javascript", javascriptSupport);

  const markdownConverter = new Remarkable({
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(lang, str).value;
        } catch (e) {
          console.error(e);
        }
      }
      return ""; // use external default escaping
    },
  });

  const introduction = document.querySelector("#introduction");
  const readme = await fetchRepoFile("README.md");
  introduction.innerHTML = markdownConverter.render(readme);

  const bookChapters = Array.from(
    { length: 14 },
    (_, index) => `chapter${++index}.md`
  );

  const chaptersMarkdown = await Promise.all(
    bookChapters.map(async (page) => await fetchRepoFile(`text/${page}`))
  );

  // Create Fragment In Order To Mutate The Book Chapters As DOM Nodes
  const chaptersFragment = document
    .createRange()
    .createContextualFragment(
      chaptersMarkdown.reduce(
        (html, chapter) => html + markdownConverter.render(chapter),
        ""
      )
    );

  let uniqueSectionID = 0;
  const headerNodes = [
    ...chaptersFragment.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  ].map((chapterSection) => {
    chapterSection.id = ++uniqueSectionID + "-" + chapterSection.textContent;
    return chapterSection;
  });

  const tableOfContents = document.createDocumentFragment();
  headerNodes.forEach((node) => {
    const link = document.createElement("a");
    link.href = "#" + node.id;
    link.textContent = node.textContent;
    link.classList.add("indent-" + node.tagName);

    tableOfContents.appendChild(link);
  });
  document.querySelector("#table-of-contents").appendChild(tableOfContents);

  const markdownBody = document.querySelector(".markdown-body");
  // Replace Loading Indicator With Book Content
  markdownBody.replaceChild(
    chaptersFragment,
    markdownBody.querySelector("#loading")
  );

  // Restore Scroll Position From Location Hash
  const locationHash = window.location.hash;
  if (locationHash.length) {
    try {
      const elementID = window.decodeURI(locationHash.substring(1));
      document.getElementById(elementID).scrollIntoView();
    } catch (e) {
      console.error(e);
    }
  } else {
    const bookScrollY = window.localStorage.getItem("bookScrollY");
    if (bookScrollY) {
      // Restore Scroll Position From Storage
      window.scroll({ top: bookScrollY });
    }
  }

  // Sync Scroll Position To Storage
  document.addEventListener(
    "scroll",
    () => {
      window.localStorage.setItem("bookScrollY", window.scrollY);
    },
    {
      capture: true,
      passive: true,
    }
  );

  async function fetchRepoFile(path) {
    const URL = `https://raw.githubusercontent.com/purescript-contrib/purescript-book/master/${path}`;

    const requestHeaders = new Headers();
    requestHeaders.append("pragma", "no-cache");
    requestHeaders.append("cache-control", "no-cache");

    return await fetch(URL, { requestHeaders, cache: "reload" })
      .then((r) => r.text())
      .catch((e) => console.error(e));
  }
})();
