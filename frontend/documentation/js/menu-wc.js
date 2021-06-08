'use strict';


customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">cucumber-frontend documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-toggle="collapse" ${ isNormalMode ?
                                'data-target="#modules-links"' : 'data-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link">AppModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                            'data-target="#components-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' : 'data-target="#xs-components-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' :
                                            'id="xs-components-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' }>
                                            <li class="link">
                                                <a href="components/AccountManagementComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">AccountManagementComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/AppComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">AppComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/ConfirmResetPasswordComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">ConfirmResetPasswordComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/DeleteScenarioToast.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">DeleteScenarioToast</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/EditableComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">EditableComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/ExampleTableComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">ExampleTableComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/FeedbackComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">FeedbackComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/LoginComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">LoginComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/ModalsComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">ModalsComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/ParentComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">ParentComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/RegistrationComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">RegistrationComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/ReportComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">ReportComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/ReportHistoryComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">ReportHistoryComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/ResetPasswordComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">ResetPasswordComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/RunTestToast.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">RunTestToast</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/ScenarioEditorComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">ScenarioEditorComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/StoriesBarComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">StoriesBarComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/StoryEditorComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">StoryEditorComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/TermsComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">TermsComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/TestAccountComponent.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">TestAccountComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                        'data-target="#directives-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' : 'data-target="#xs-directives-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' }>
                                        <span class="icon ion-md-code-working"></span>
                                        <span>Directives</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="directives-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' :
                                        'id="xs-directives-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' }>
                                        <li class="link">
                                            <a href="directives/EditModeDirective.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules">EditModeDirective</a>
                                        </li>
                                        <li class="link">
                                            <a href="directives/EditableOnEnterDirective.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules">EditableOnEnterDirective</a>
                                        </li>
                                        <li class="link">
                                            <a href="directives/FocusableDirective.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules">FocusableDirective</a>
                                        </li>
                                        <li class="link">
                                            <a href="directives/PasswordConfirmedValidatorDirective.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules">PasswordConfirmedValidatorDirective</a>
                                        </li>
                                        <li class="link">
                                            <a href="directives/ViewModeDirective.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules">ViewModeDirective</a>
                                        </li>
                                    </ul>
                                </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                        'data-target="#injectables-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' : 'data-target="#xs-injectables-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' :
                                        'id="xs-injectables-links-module-AppModule-cbe46f53608894cf36f4ac2a6b527c6f"' }>
                                        <li class="link">
                                            <a href="injectables/ApiService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>ApiService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#components-links"' :
                            'data-target="#xs-components-links"' }>
                            <span class="icon ion-md-cog"></span>
                            <span>Components</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="components-links"' : 'id="xs-components-links"' }>
                            <li class="link">
                                <a href="components/LoginComponent.html" data-type="entity-link">LoginComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ScenarioEditorComponent.html" data-type="entity-link">ScenarioEditorComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/StoriesBarComponent.html" data-type="entity-link">StoriesBarComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/StoryEditorComponent.html" data-type="entity-link">StoryEditorComponent</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#injectables-links"' :
                                'data-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/ApiService.html" data-type="entity-link">ApiService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#interceptors-links"' :
                            'data-target="#xs-interceptors-links"' }>
                            <span class="icon ion-ios-swap"></span>
                            <span>Interceptors</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="interceptors-links"' : 'id="xs-interceptors-links"' }>
                            <li class="link">
                                <a href="interceptors/TimeoutInterceptor.html" data-type="entity-link">TimeoutInterceptor</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#guards-links"' :
                            'data-target="#xs-guards-links"' }>
                            <span class="icon ion-ios-lock"></span>
                            <span>Guards</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="guards-links"' : 'id="xs-guards-links"' }>
                            <li class="link">
                                <a href="guards/AuthGuard.html" data-type="entity-link">AuthGuard</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#interfaces-links"' :
                            'data-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/Background.html" data-type="entity-link">Background</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Block.html" data-type="entity-link">Block</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Report.html" data-type="entity-link">Report</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ReportContainer.html" data-type="entity-link">ReportContainer</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RepositoryContainer.html" data-type="entity-link">RepositoryContainer</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Scenario.html" data-type="entity-link">Scenario</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StepDefinition.html" data-type="entity-link">StepDefinition</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StepDefinitionBackground.html" data-type="entity-link">StepDefinitionBackground</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StepType.html" data-type="entity-link">StepType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Story.html" data-type="entity-link">Story</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/User.html" data-type="entity-link">User</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#miscellaneous-links"'
                            : 'data-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
                        </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});