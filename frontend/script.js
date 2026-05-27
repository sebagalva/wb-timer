async function loadWB() {
  const res = await fetch("wb-timer-production.up.railway.app/lastWB");
  const data = await res.json();
  document.getElementById("value").innerText = data.lastWB;
}

loadWB();
setInterval(loadWB, 10000);
