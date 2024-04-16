import { Component } from "@angular/core";
import { NgForm } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ThemingService } from "../Services/theming.service";
import { LoginService } from "../Services/login.service";

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
  error: boolean;
  defaultErrorMessage = "Couldn't set password!";
  /**
   * Successfully sent email
   */
  success: boolean;
  defaultSuccessMessage = "Your Password Has Been Updated!";

  /**
   * The message to display
   */
  message: string;

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
    this.error = false;
    this.success = false;
    this.loginService.confirmReset(this.uuid, form.value.password).subscribe({
      next: (value) => {
        this.message = this.defaultSuccessMessage;
        this.success = true;
      },
      error: (error) => {
        this.message = this.defaultErrorMessage;
        if (error.status === 401) {
          this.message = "This Link Has Expired!";
        }
        this.error = true;
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
