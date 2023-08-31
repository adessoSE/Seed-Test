import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-confirm-reset-password-popup",
  templateUrl: "./confirm-reset-password-popup.component.html",
  styleUrls: ["./confirm-reset-password-popup.component.css"],
})
export class ConfirmResetPasswordPopupComponent {
  @Input() backgroundColor: string = "red"; // Default background color is red
  @Input() message: string = "Reset your password?"; // Default message

  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigateByUrl("/login");
  }
}
