async function loadWB() {
  const res = await fetch("https://TUO_BACKEND.up.railway.app/lastWB");
  const data = await res.json();
  document.getElementById("value").innerText = data.lastWB;
}

loadWB();
setInterval(loadWB, 10000);
