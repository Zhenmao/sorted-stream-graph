class SortedStreamGraph {
  constructor({ el, data, xKey, stackKeys, stackOffset = "stackOffsetNone" }) {
    this.el = el;
    this.data = data;
    this.xKey = xKey;
    this.stackKeys = stackKeys;
    this.stackOffset = stackOffset;
    this.resized = this.resized.bind(this);
    this.init();
  }

  init() {
    this.setup();
    this.wrangle();
    this.ro = new ResizeObserver(this.resized);
    this.ro.observe(this.el);
  }

  setup() {
    this.height = 640;
    this.marginTop = 16;
    this.marginRight = 120;
    this.marginBottom = 32;
    this.marginLeft = 64;
    this.streamsPadding = 8;

    this.x = d3.scaleLinear();
    this.y = d3.scaleLinear();

    this.stack = d3
      .stack()
      .keys(this.stackKeys)
      .value((data, key) => data[key] || 0)
      .order(d3.stackOrderNone);

    this.path = d3
      .area()
      .curve(d3.curveBumpX)
      .x((d) => this.x(d.data[this.xKey]))
      .y0((d) => this.y(d[0]) - d.padding)
      .y1((d) => this.y(d[1]) - d.padding)
      .defined((d) => d[1] - d[0] > 0);

    this.container = d3.select(this.el).attr("class", "sorted-stream-graph");
    this.svg = this.container.append("svg");
    this.gX = this.svg.append("g").attr("class", "axis axis--x");
    this.gStreams = this.svg.append("g").attr("class", "streams");
  }

  // https://github.com/rawgraphs/rawgraphs-charts/blob/master/src/bumpchart/render.js
  wrangle() {
    this.stack.offset(d3[this.stackOffset]);

    this.stackedData = this.stack(this.data);
    // Resort streams
    this.stackedData[0].map((row, rowIndex) => {
      // Get the values for each vertical stack
      const vStack = this.stackedData.map((d) => d[rowIndex]);
      let minValue = d3.min(vStack, (d) => d[0]);
      // Keep original order
      vStack.forEach((d, i) => {
        d.originalIndex = i;
      });
      // Sort by size
      vStack.sort((a, b) => d3.ascending(a[1] - a[0], b[1] - b[0]));
      // Re-calculate positions
      let paddingIndex = 0;
      vStack.forEach((d, i) => {
        const delta = d[1] - d[0];
        d[0] = minValue;
        d[1] = minValue + delta;
        d.rankIndex = i;
        minValue += delta;

        // Add padding to data
        d.padding = paddingIndex * this.streamsPadding;
        // Get next value in the horizontal stack. If it is the last one, it is equal to itself.
        const nv =
          rowIndex < this.stackedData.length - 1
            ? this.stackedData[d.originalIndex][rowIndex + 1]
            : d;
        // If the current value is not zero or the next value is not zero, increase the padding
        if (d[0] !== d[1] || nv[0] !== nv[1]) paddingIndex++;
      });
    });
    this.stackedData.forEach((d) => {
      const latest = d[d.length - 1];
      d.hasLatest = latest[1] - latest[0] > 0;
      d.totalSize = d3.sum(d, (d) => d[1] - d[0]);
    });
    this.stackedData.sort((a, b) => d3.descending(a.totalSize, b.totalSize));

    this.x.domain(d3.extent(this.data, (d) => d[this.xKey]));

    const minValue = d3.min(this.stackedData, (d) => d3.min(d, (d) => d[0]));
    const maxValue = d3.max(this.stackedData, (d) => d3.max(d, (d) => d[1]));
    this.y.domain([minValue, maxValue]);

    if (this.width) this.render();
  }

  resized() {
    this.width = this.el.clientWidth;

    this.x.range([this.marginLeft, this.width - this.marginRight]);

    this.y.range([
      this.height - this.marginBottom,
      this.marginTop + this.streamsPadding * (this.stackKeys.length - 1),
    ]);

    this.svg.attr("viewBox", [0, 0, this.width, this.height]);

    this.render();
  }

  render() {
    const t = this.svg.transition().duration(500);

    this.gX
      .attr("transform", `translate(0,${this.height - this.marginBottom})`)
      .call(
        d3
          .axisBottom(this.x)
          .ticks((this.width - this.marginLeft - this.marginRight) / 80)
          .tickFormat((d) => d)
          .tickSize(-(this.height - this.marginTop - this.marginBottom))
          .tickPadding(8)
      )
      .select(".domain")
      .remove();

    this.gStreams
      .selectAll(".stream")
      .data(this.stackedData, (d) => d.key)
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "stream")
          .call((g) =>
            g.append("path").attr("class", "stream__path").attr("d", this.path)
          )
          .call((g) =>
            g
              .append("text")
              .attr("class", "stream__text")
              .attr("dy", "0.32em")
              .attr("text-anchor", (d) => (d.hasLatest ? "start" : "end"))
              .attr("dx", (d) => (d.hasLatest ? 8 : -8))
              .attr("x", (d) =>
                d.hasLatest ? this.x.range()[1] : this.x.range()[0]
              )
              .attr("y", (d) => {
                const e = d.hasLatest ? d[d.length - 1] : d[0];
                return d3.mean(e.map(this.y)) - e.padding;
              })
              .text((d) => d.key)
          )
      )
      .transition(t)
      .call((t) => t.select(".stream__path").attr("d", this.path))
      .call((t) =>
        t
          .select(".stream__text")
          .attr("x", (d) =>
            d.hasLatest ? this.x.range()[1] : this.x.range()[0]
          )
          .attr("y", (d) => {
            const e = d.hasLatest ? d[d.length - 1] : d[0];
            return d3.mean(e.map(this.y)) - e.padding;
          })
      );
  }

  updateStackOffset(stackOffset) {
    this.stackOffset = stackOffset;
    this.wrangle();
  }
}
