import { Component } from "@angular/core";
import { NgForm } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ThemingService } from "../Services/theming.service";
import { LoginService } from "../Services/login.service";
import { FeGaussianBlurElement } from "canvg";

/**
 * Component to enable to reset the password
 */
@Component({
  selector: "app-confirm-reset-password",
  templateUrl: "./confirm-reset-password.component.html",
  styleUrls: ["./confirm-reset-password.component.css"],
})
export class ConfirmResetPasswordComponent {
  /**
   * Id of the reset password request
   */
  uuid: string;

  /**
   * New Password of the user
   */
  password: string;

  /**
   * Error during reset password
   */
  error: string;
  defaultErrorMessage = "Couldn't set password!";
  /**
   * Error for invalid link/token
   */
  tokenError: string;

  /**
   * Successfully sent email
   */
  success: string;
  defaultSuccessMessage = "Password set!";

  isDark: boolean;
  /**
   * Constructor
   * @param loginService
   * @param router
   * @param route
   */
  constructor(
    public loginService: LoginService,
    private router: Router,
    private route: ActivatedRoute,
    private themeService: ThemingService
  ) {
    this.route.queryParams.subscribe((params) => {
      if (params.uuid) {
        this.uuid = params.uuid;
      }
    });
  }

  ngOnInit(): void {
    this.isDark = this.themeService.isDarkMode();
  }

  /**
   * Confirm the reset and send new password
   * @param form form with the new password value
   */
  confirmReset(form: NgForm) {
    this.error = undefined;
    this.success = undefined;
    this.tokenError = undefined;
    this.loginService.confirmReset(this.uuid, form.value.password).subscribe({
      next: (value) => {
        this.error = undefined;
        this.success = this.defaultSuccessMessage;
        setTimeout(() => {
          this.router.navigate(["/login"]);
        }, 1500);
        console.log(value);
      },
      error: (error) => {
        this.success = undefined;
        if (error.status === 401) {
          this.tokenError = "error";
          return;
        }
        this.error = this.defaultErrorMessage;
      },
    });
  }

  /**
   * Redirects the user to the login component
   */
  redirectToLogin() {
    this.router.navigate(["/"]);
  }

  redirectToReset() {
    this.router.navigate(["/resetpassword"]);
  }

  isDarkModeOn() {
    this.isDark = this.themeService.isDarkMode();
    return this.isDark;
  }
}
