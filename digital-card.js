(function () {
  const card = document.querySelector("[data-digital-card]");
  if (!card) {
    return;
  }

  const shareButton = card.querySelector("[data-share-card]");
  const copyButton = card.querySelector("[data-copy-card]");
  const nfcButton = card.querySelector("[data-write-nfc]");
  const status = card.querySelector("[data-card-status]");

  const details = {
    name: card.dataset.name || "Arafath Nihar",
    title: card.dataset.title || "",
    email: card.dataset.email || "",
    url: card.dataset.url || window.location.href,
    vcf: card.dataset.vcf || "arafath-nihar.vcf"
  };

  const shareText = [
    details.name,
    details.title,
    details.email,
    details.url
  ].filter(Boolean).join("\n");

  function setStatus(message, tone) {
    if (!status) {
      return;
    }

    status.textContent = message;
    if (tone) {
      status.dataset.tone = tone;
    } else {
      delete status.dataset.tone;
    }
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.top = "-1000px";
    textArea.style.left = "-1000px";
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand("copy");
    textArea.remove();

    if (!copied) {
      throw new Error("Copy command was not available");
    }
  }

  async function loadContactFile() {
    if (!window.File || !navigator.canShare) {
      return null;
    }

    const response = await fetch(details.vcf, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const file = new File([blob], "arafath-nihar.vcf", {
      type: blob.type || "text/vcard"
    });

    return navigator.canShare({ files: [file] }) ? file : null;
  }

  function formatNfcError(error) {
    if (!error || !error.name) {
      return "could not write the tag";
    }

    const messages = {
      NotAllowedError: "permission was not granted",
      NotSupportedError: "this phone, browser, or tag is not supported",
      NotReadableError: "NFC is blocked or unavailable on this device",
      NetworkError: "the tag moved before the write completed",
      AbortError: "the NFC write was cancelled"
    };

    return messages[error.name] || error.message || error.name;
  }

  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      try {
        const contactFile = await loadContactFile();
        if (contactFile) {
          await navigator.share({
            title: `${details.name} contact card`,
            text: details.title,
            files: [contactFile]
          });
          setStatus("Contact card shared.", "success");
          return;
        }

        if (navigator.share) {
          await navigator.share({
            title: `${details.name} contact card`,
            text: shareText,
            url: details.url
          });
          setStatus("Profile link shared.", "success");
          return;
        }

        await copyText(shareText);
        setStatus("Contact details copied.", "success");
      } catch (error) {
        if (error && error.name === "AbortError") {
          setStatus("Sharing cancelled.");
          return;
        }

        try {
          await copyText(shareText);
          setStatus("Sharing was unavailable, so contact details were copied.", "success");
        } catch (copyError) {
          setStatus("Sharing and copy were unavailable in this browser.", "warning");
        }
      }
    });
  }

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      try {
        await copyText(details.url);
        setStatus("Profile link copied.", "success");
      } catch (error) {
        setStatus("Copy was unavailable in this browser.", "warning");
      }
    });
  }

  if (nfcButton) {
    if (!("NDEFReader" in window) || !window.isSecureContext) {
      nfcButton.disabled = true;
      nfcButton.title = "Web NFC requires HTTPS and a compatible mobile browser, mainly Chrome on Android.";
    }

    nfcButton.addEventListener("click", async () => {
      if (!("NDEFReader" in window) || !window.isSecureContext) {
        setStatus("Web NFC is available only on compatible secure mobile browsers.", "warning");
        return;
      }

      try {
        setStatus("Hold a writable NFC tag near this phone.");
        const ndef = new NDEFReader();
        await ndef.write({
          records: [
            {
              recordType: "url",
              data: details.url
            }
          ]
        });
        setStatus("NFC tag written with the profile link.", "success");
      } catch (error) {
        setStatus(`NFC write failed: ${formatNfcError(error)}.`, "warning");
      }
    });
  }
}());
