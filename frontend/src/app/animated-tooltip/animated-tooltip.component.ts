import { Component, Input, OnInit } from "@angular/core";

@Component({
  selector: "app-animated-tooltip",
  templateUrl: "./animated-tooltip.component.html",
  styleUrls: ["./animated-tooltip.component.css"],
})
export class AnimatedTooltipComponent implements OnInit {
  @Input() baseTitle: string = "Tooltip";
  toolTipTitle = this.baseTitle;
  private dotCount: number = 0;

  constructor() {}

  ngOnInit() {
    this.animateDots();
  }

  animateDots() {
    setInterval(() => {
      this.dotCount = (this.dotCount + 1) % 4;
      const dots = ".".repeat(this.dotCount);
      this.toolTipTitle = `${this.baseTitle} ${dots}`;
    }, 500); // Update every 500 milliseconds
  }
}
