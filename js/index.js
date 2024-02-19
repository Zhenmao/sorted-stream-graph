d3.csv("./apple-revenue.csv", d3.autoType).then((data) => {
  const stackOffsetInputs = Array.from(
    document.querySelectorAll("[name='stackOffset']")
  );
  stackOffsetInputs.forEach((input) =>
    input.addEventListener("change", (event) => {
      sortedStreamGraph.updateStackOffset(event.target.value);
    })
  );

  const sortedStreamGraph = new SortedStreamGraph({
    el: document.getElementById("sortedStreamGraph"),
    data,
    xKey: data.columns[0],
    stackKeys: data.columns.slice(1),
    stackOffset: stackOffsetInputs.find((input) =>
      input.hasAttribute("checked")
    ).value,
  });
});
