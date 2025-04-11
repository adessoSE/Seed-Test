import { Component } from "@angular/core";
import { NgForm } from "@angular/forms";
import { Router } from "@angular/router";
import { ThemingService } from "../Services/theming.service";
import { LoginService } from "../Services/login.service";

/**
 * Component to reset the password
 */
@Component({
    selector: "app-reset-password",
    templateUrl: "./reset-password.component.html",
    styleUrls: ["./reset-password.component.css"],
    standalone: false
})
export class ResetPasswordComponent {
  /**
   * Error during reset password
   */
  error: string;
  defaultErrorMessage = "Reset password email faild";

  /**
   * Successfully sent email
   */
  success: string;
  defaultSuccessMessage = "Email has been sent!";

  isDark: boolean;

  /**
   * @ignore
   */
  constructor(
    public loginService: LoginService,
    private router: Router,
    public themeService: ThemingService
  ) {}

  ngOnInit(): void {
    this.isDark = this.themeService.isDarkMode();
  }

  /**
   * Request a reset of the password
   * @param form
   */
  requestReset(form: NgForm) {
    this.error = undefined;
    this.success = undefined;
    this.loginService.requestReset(form.value.email).subscribe({
      next: (value) => {
        this.error = undefined;
        this.success = this.defaultSuccessMessage;
      },
      error: (error) => {
        this.success = undefined;
        if (error !== "No user found with the given email adress!") {
          this.error = "Email couldn't be send.";
          return;
        }
        this.error = error.error;
      },
    });
  }

  /**
   * Redirects the user to the register component
   */
  redirectToRegister() {
    this.router.navigate(["/register"]);
  }

  /**
   * Redirects the user to the login component
   */
  redirectToLogin() {
    this.router.navigate(["/"]);
  }

  isDarkModeOn() {
    this.isDark = this.themeService.isDarkMode();
    return this.isDark;
  }
}
