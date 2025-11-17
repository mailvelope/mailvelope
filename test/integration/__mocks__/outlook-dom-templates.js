/**
 * Mock Outlook DOM structures for testing
 * Based on actual HTML from outlook.office.com
 */

export const OutlookDOMTemplates = {
  /**
   * Compose button area (toolbar)
   * Location: Top toolbar where Mailvelope button should be injected
   *
   * Based on actual Outlook structure with Fluent UI components
   * Source: Real HTML from outlook.office.com (German locale)
   */
  composeToolbar: `
    <div role="group" aria-label="Verschieben und löschen" data-unique-id="114" class="ms-OverflowSet root-169">
      <!-- COMPOSE BUTTON (New Email / Neue E-Mail) -->
      <div class="ms-OverflowSet-item ribbonOverflowItem item-170" role="none">
        <div id="588" data-unique-id="Ribbon-588" data-automation-type="RibbonSplitButton" role="group" class="fui-SplitButton">
          <button type="button"
                  class="fui-Button r1alrhcs ms-Button ms-ButtonNext fui-SplitButton__primaryActionButton"
                  aria-label="Neue E-Mail"
                  data-automation-type="RibbonSplitButton"
                  data-unique-id="Ribbon-588"
                  tabindex="0">
            <span class="fui-Button__icon rywnvv2 ms-RibbonButton-icon">
              <i data-icon-name="ComposeRegular" aria-hidden="true" class="root-195">
                <span role="presentation" aria-hidden="true" class="FLwLv">
                  <i class="fui-Icon-font Q0K3G" fill="currentColor" aria-hidden="true"></i>
                </span>
              </i>
            </span>
            <span class="textContainer">Neue E-Mail</span>
            <span class="acui-hidden-content">Erstellen Sie eine neue E-Mail. (N)</span>
          </button>
          <button type="button"
                  class="fui-Button r1alrhcs fui-MenuButton ms-Button ms-ButtonNext fui-SplitButton__menuButton"
                  aria-expanded="false"
                  aria-label=" Erweitern, um weitere neue Optionen anzuzeigen"
                  data-automation-type="RibbonSplitButton"
                  data-unique-id="Ribbon-588-Menu"
                  aria-haspopup="true"
                  tabindex="-1">
            <span class="acui-hidden-content">Neue E-Mail</span>
            <span class="fui-MenuButton__menuIcon">
              <i data-icon-name="ChevronDownRegular" aria-hidden="true">
                <span role="presentation" aria-hidden="true" class="FLwLv">
                  <i class="fui-Icon-font Q0K3G" fill="currentColor" aria-hidden="true"></i>
                </span>
              </i>
            </span>
          </button>
        </div>
      </div>

      <!-- MAILVELOPE BUTTON WILL BE INJECTED HERE -->

      <!-- DELETE BUTTON (Löschen) -->
      <div class="ms-OverflowSet-item ribbonOverflowItem item-170" role="none">
        <div id="519" data-unique-id="Ribbon-519" data-automation-type="RibbonSplitButton" role="group" class="fui-SplitButton">
          <button type="button"
                  class="fui-Button r1alrhcs ms-Button ms-ButtonNext fui-SplitButton__primaryActionButton"
                  aria-disabled="true"
                  aria-label="Löschen"
                  tabindex="-1">
            <span class="fui-Button__icon rywnvv2 ms-RibbonButton-icon">
              <i data-icon-name="DeleteRegular" aria-hidden="true" class="root-196">
                <span role="presentation" aria-hidden="true" class="FLwLv">
                  <i class="fui-Icon-font Q0K3G" fill="currentColor" aria-hidden="true"></i>
                </span>
              </i>
            </span>
            <span class="acui-hidden-content">Diese Nachricht löschen. (Löschen / Rücktaste)</span>
          </button>
          <button type="button"
                  class="fui-Button r1alrhcs fui-MenuButton ms-Button ms-ButtonNext fui-SplitButton__menuButton"
                  aria-expanded="false"
                  aria-disabled="true"
                  tabindex="-1">
            <span class="acui-hidden-content">Löschen</span>
            <span class="fui-MenuButton__menuIcon">
              <i data-icon-name="ChevronDownRegular" aria-hidden="true"></i>
            </span>
          </button>
        </div>
      </div>

      <!-- ARCHIVE BUTTON (Archivieren) -->
      <div class="ms-OverflowSet-item ribbonOverflowItem item-170" role="none">
        <button type="button"
                id="505"
                class="fui-Button r1alrhcs ms-Button ms-ButtonNext"
                aria-disabled="true"
                aria-label="Archivieren"
                data-automation-type="RibbonButton"
                data-unique-id="Ribbon-505"
                tabindex="-1">
          <span class="fui-Button__icon rywnvv2 ms-RibbonButton-icon">
            <i data-icon-name="ArchiveRegular" aria-hidden="true" class="root-241">
              <span role="presentation" aria-hidden="true" class="FLwLv">
                <i class="fui-Icon-font Q0K3G" fill="currentColor" aria-hidden="true"></i>
              </span>
            </i>
          </span>
          <span class="acui-hidden-content">Verschieben Sie diese Nachricht in Ihren Archivordner. (E)</span>
        </button>
      </div>

      <!-- REPORT BUTTON (Melden) -->
      <div class="ms-OverflowSet-item ribbonOverflowItem item-170" role="none">
        <div id="657" data-unique-id="Ribbon-657" data-automation-type="RibbonSplitButton" role="group" class="fui-SplitButton">
          <button type="button"
                  class="fui-Button r1alrhcs ms-Button ms-ButtonNext fui-SplitButton__primaryActionButton"
                  aria-disabled="true"
                  aria-label="Melden"
                  tabindex="-1">
            <span class="fui-Button__icon rywnvv2 ms-RibbonButton-icon">
              <i data-icon-name="ShieldErrorRegular" aria-hidden="true" class="root-242">
                <span role="presentation" aria-hidden="true" class="FLwLv">
                  <i class="fui-Icon-font Q0K3G" fill="currentColor" aria-hidden="true"></i>
                </span>
              </i>
            </span>
            <span class="acui-hidden-content">Melden Sie diese Nachricht als Phishingversuch.</span>
          </button>
        </div>
      </div>
    </div>
  `,

  /**
   * Simplified compose toolbar (minimal version for quick tests)
   * Only contains the essential compose button structure
   */
  composeToolbarMinimal: `
    <div class="ms-OverflowSet root-169" role="group">
      <div class="ms-OverflowSet-item ribbonOverflowItem item-170" role="none">
        <button type="button" class="fui-Button ms-Button fui-SplitButton__primaryActionButton" aria-label="New mail">
          <span class="fui-Button__icon ms-RibbonButton-icon">
            <i data-icon-name="ComposeRegular" aria-hidden="true"></i>
          </span>
          <span class="textContainer">New mail</span>
        </button>
      </div>
    </div>
  `,

  /**
   * Reading pane with action buttons (Reply, Forward)
   * Location: Message view where Secure Reply/Forward buttons should be injected
   *
   * Based on actual Outlook structure with message action toolbar
   * Includes MailList with active conversation for msgId generation
   */
  readingPaneWithActions: `
    <!-- MailList with active conversation (required for msgId) -->
    <div id="MailList" tabindex="-1">
      <div role="listbox">
        <div id="test-conversation-item"
             data-convid="AQQkADAwATMwMAItYjBiZi03YmY3LTAwAi0wMAoAEABjgKbAj7DwSKnW58xs6QY7"
             aria-selected="true"
             role="option">
          <span>Test conversation preview</span>
        </div>
      </div>
    </div>

    <div role="main" data-app-section="MailReadCompose" aria-label="Lesebereich">
      <!-- Message container with .aVla3 class (required for msgId) -->
      <div class="aVla3">
        <div class="wide-content-host">
          <!-- Message header with sender info -->
          <div class="uSg02">
            <div class="DgV2h lAKmW">
              <div class="bz1XJ">
                <div class="PW01N glFkS">
                  <span class="Q84Kk ujrct s5zQy" role="region">
                    <span class="o4zjZ ujrct" aria-label="Von: sender@example.com" tabindex="0">
                      <span class="OZZZK">sender@example.com</span>
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <!-- ACTION BUTTONS TOOLBAR -->
          <div aria-label="Nachrichtenaktionen" role="toolbar" class="ms-OverflowSet root-308">
            <!-- Reply Button -->
            <div class="ms-OverflowSet-item item-170" role="none">
              <div class="TvVk3 body-157">
                <button type="button" role="menuitem"
                        class="ms-Button ms-Button--commandBar root-318"
                        aria-label="Antworten"
                        data-is-focusable="true">
                  <span class="ms-Button-flexContainer flexContainer-159">
                    <i data-icon-name="ArrowReplyRegular" aria-hidden="true" class="ms-Icon root-89">
                      <span role="presentation" class="FLwLv">
                        <i class="fui-Icon-font Q0K3G" fill="currentColor"></i>
                      </span>
                    </i>
                    <span class="ms-Button-textContainer ye2VL textContainer-160">
                      <span class="ms-Button-label label-312">Antworten</span>
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <!-- Reply All Button -->
            <div class="ms-OverflowSet-item item-170" role="none">
              <div class="TvVk3 body-157">
                <button type="button" role="menuitem"
                        class="ms-Button ms-Button--commandBar root-318"
                        aria-label="Allen antworten"
                        data-is-focusable="true">
                  <span class="ms-Button-flexContainer flexContainer-159">
                    <i data-icon-name="ArrowReplyAllRegular" aria-hidden="true" class="ms-Icon root-89">
                      <span role="presentation" class="FLwLv">
                        <i class="fui-Icon-font Q0K3G" fill="currentColor"></i>
                      </span>
                    </i>
                    <span class="ms-Button-textContainer ye2VL textContainer-160">
                      <span class="ms-Button-label label-312">Allen antworten</span>
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <!-- Forward Button -->
            <div class="ms-OverflowSet-item item-170" role="none">
              <div class="TvVk3 body-157">
                <button type="button" role="menuitem"
                        class="ms-Button ms-Button--commandBar root-318"
                        aria-label="Weiterleiten"
                        data-is-focusable="true">
                  <span class="ms-Button-flexContainer flexContainer-159">
                    <i data-icon-name="ArrowForwardRegular" aria-hidden="true" class="ms-Icon root-89">
                      <span role="presentation" class="FLwLv">
                        <i class="fui-Icon-font Q0K3G" fill="currentColor"></i>
                      </span>
                    </i>
                    <span class="ms-Button-textContainer ye2VL textContainer-160">
                      <span class="ms-Button-label label-312">Weiterleiten</span>
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <!-- MAILVELOPE SECURE REPLY/FORWARD BUTTONS WILL BE INJECTED HERE -->

            <!-- Divider -->
            <div class="ms-OverflowSet-item item-170" role="none">
              <span class="divider-320"></span>
            </div>
          </div>
        </div>

        <!-- Message recipients -->
        <div class="DrnCK">
          <div data-testid="RecipientWell" class="kcAOr t9ThB">
            <span>An: recipient@example.com</span>
          </div>
        </div>

          <!-- MESSAGE BODY -->
          <div role="document">
            <div id="UniqueMessageBody_2" aria-label="Nachrichtentext"
                 class="XbIp4 jmmB7 customScrollBar GNqVo allowTextSelection OuGoX" tabindex="0">
              <div class="BIZfh">
                <p>This is a regular message body.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  /**
   * Reading pane with PGP encrypted message
   * Contains actual PGP message block for testing detection and decryption
   * Uses .aVla3 container structure matching real Outlook
   * Includes MailList with active conversation for msgId generation
   */
  readingPaneWithPGP: `
    <!-- MailList with active conversation (required for msgId) -->
    <div id="MailList" tabindex="-1">
      <div role="listbox">
        <div id="test-conversation-item"
             data-convid="AQQkADAwATMwMAItYjBiZi03YmY3LTAwAi0wMAoAEABjgKbAj7DwSKnW58xs6QY7"
             aria-selected="true"
             role="option">
          <span>Test conversation preview</span>
        </div>
      </div>
    </div>

    <div id="ConversationReadingPaneContainer" class="MtujV" tabindex="-1">
      <div data-app-section="ConversationContainer" class="Q8TCC yyYQP">
        <div class="ZOM9m">
          <!-- Message container with .aVla3 class -->
          <div class="aVla3">
            <div aria-expanded="true" class="BS0OK">
              <div class="wide-content-host">
                <div tabindex="-1" aria-label="Email message" class="SlLx9 WWy1F">
                  <div class="uSg02">
                    <div class="DgV2h lAKmW">
                      <div class="bz1XJ">
                        <div class="PW01N glFkS">
                          <span class="o4zjZ ujrct" aria-label="From: sender@example.com">
                            <span class="OZZZK">sender@example.com</span>
                          </span>
                        </div>
                      </div>

                      <!-- ACTION BUTTONS TOOLBAR -->
                      <div aria-label="Message actions" role="toolbar" class="ms-OverflowSet root-341">
                        <div class="ms-OverflowSet-item item-170" role="none">
                          <button type="button" role="menuitem" class="ms-Button ms-Button--commandBar" aria-label="Reply">
                            <i data-icon-name="ArrowReplyRegular" aria-hidden="true"></i>
                            <span>Reply</span>
                          </button>
                        </div>
                        <div class="ms-OverflowSet-item item-170" role="none">
                          <button type="button" role="menuitem" class="ms-Button ms-Button--commandBar" aria-label="Forward">
                            <i data-icon-name="ArrowForwardRegular" aria-hidden="true"></i>
                            <span>Forward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- MESSAGE BODY WITH PGP CONTENT -->
                  <div role="document">
                    <div id="UniqueMessageBody_1" aria-label="Message body"
                         class="XbIp4 jmmB7 customScrollBar" tabindex="0">
                      <div class="BIZfh">
                        <pre><div>-----BEGIN PGP MESSAGE-----
Version: Mailvelope v5.2.0
Comment: https://mailvelope.com

wcFMA5+MrhXfgqB/AQ//QVnoCOWhye39R2VmBKRmrlj7svoXmvbTMdjuoYqn
Pfb4vHmeE2Y3uQt+42IxUQ0/s6NTxZTM7NF0plbmmgwRcEXAGCizo4Hplnuo
4CdKKCSNDyaTBSPBgM0Hvuj6JISpTjHaK89In+clzF8lMQsTAfWm1zFlHcO6
QDV33/RYHCBJ0qJBYeuuRAA/Bol541myM88Sx4IjgoXJsTFmoXBI3UqSoiq5
=9Hg2
-----END PGP MESSAGE-----
</div></pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  /**
   * Minimal reading pane (for quick tests)
   */
  readingPaneMinimal: `
    <!-- MailList with active conversation (required for msgId) -->
    <div id="MailList" tabindex="-1">
      <div role="listbox">
        <div id="test-conversation-item"
             data-convid="AQQkADAwATMwMAItYjBiZi03YmY3LTAwAi0wMAoAEABjgKbAj7DwSKnW58xs6QY7"
             aria-selected="true"
             role="option">
          <span>Test conversation preview</span>
        </div>
      </div>
    </div>

    <div role="main" data-app-section="MailReadCompose">
      <div class="aVla3">
        <div class="wide-content-host">
          <div aria-label="Nachrichtenaktionen" role="toolbar" class="ms-OverflowSet">
            <div class="ms-OverflowSet-item" role="none">
              <button class="ms-Button ms-Button--commandBar" aria-label="Reply">
                <i data-icon-name="ArrowReplyRegular"></i>
                <span>Reply</span>
              </button>
            </div>
            <div class="ms-OverflowSet-item" role="none">
              <button class="ms-Button ms-Button--commandBar" aria-label="Forward">
                <i data-icon-name="ArrowForwardRegular"></i>
                <span>Forward</span>
              </button>
            </div>
          </div>
          <div role="document">
            <div id="UniqueMessageBody_2" class="XbIp4">
              <div><p>Message content</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  /**
   * Message with attachments
   * Contains regular PDF attachment for structure testing
   * Uses .aVla3 container structure matching real Outlook
   * Includes MailList with active conversation for msgId generation
   */
  messageWithAttachment: `
    <!-- MailList with active conversation (required for msgId) -->
    <div id="MailList" tabindex="-1">
      <div role="listbox">
        <div id="test-conversation-item"
             data-convid="AQQkADAwATMwMAItYjBiZi03YmY3LTAwAi0wMAoAEABjgKbAj7DwSKnW58xs6QY7"
             aria-selected="true"
             role="option">
          <span>Test conversation preview</span>
        </div>
      </div>
    </div>

    <div id="ConversationReadingPaneContainer" class="MtujV" tabindex="-1">
      <div data-app-section="ConversationContainer" class="Q8TCC yyYQP">
        <div class="ZOM9m">
          <!-- Message container with .aVla3 class -->
          <div class="aVla3">
            <div aria-expanded="true" class="BS0OK">
              <div class="wide-content-host">
                <div tabindex="-1" aria-label="Email message" class="SlLx9 WWy1F">
                  <!-- Message body -->
                  <div role="document">
                    <div id="UniqueMessageBody_3" aria-label="Message body" class="XbIp4 jmmB7">
                      <div class="BIZfh">
                        <p>See attached file.</p>
                      </div>
                    </div>
                  </div>

                  <!-- Attachments section -->
                  <div class="T3idP kQkuc">
                    <div tabindex="-1" class="RrjjU sBuNd disableTextSelection">
                      <div role="listbox" aria-label="Attachments" class="E_kRz srnS5">
                        <div class="Y0d3P">
                          <div class="av-container">
                            <div role="option"
                                 aria-label="document.pdf Open 205 KB"
                                 tabindex="0"
                                 class="GpKSR C1V5C WM3Zr ERPBZ noneDensity">
                              <div draggable="true">
                                <div class="feh0T">
                                  <div class="JA9Uf YyULm">
                                    <i data-icon-name="pdf20_svg" class="WwCcl root-420">
                                      <img src="//res.public.onecdn.static.microsoft/assets/fluentui-resources/1.0.23/app-min/assets/item-types/20/pdf.svg" alt=".pdf">
                                    </i>
                                    <div class="uDIro">
                                      <div class="">
                                        <div class="VlyYV PQeLQ QEiYT" title="document.pdf">document.pdf</div>
                                        <div title="205 KB">
                                          <span class="rc4Lo QxTLU puwJz QEiYT">205 KB</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div class="o4euS">
                                    <button type="button"
                                            aria-label="More actions"
                                            aria-haspopup="true"
                                            class="ms-Button ms-Button--icon">
                                      <i data-icon-name="ChevronDownMed"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  /**
   * Message with encrypted attachments (.gpg, .pgp files)
   * For testing encrypted attachment detection
   * Uses .aVla3 container structure matching real Outlook
   * Includes MailList with active conversation for msgId generation
   */
  messageWithEncryptedAttachments: `
    <!-- MailList with active conversation (required for msgId) -->
    <div id="MailList" tabindex="-1">
      <div role="listbox">
        <div id="test-conversation-item"
             data-convid="AQQkADAwATMwMAItYjBiZi03YmY3LTAwAi0wMAoAEABjgKbAj7DwSKnW58xs6QY7"
             aria-selected="true"
             role="option">
          <span>Test conversation preview</span>
        </div>
      </div>
    </div>

    <div id="ConversationReadingPaneContainer" class="MtujV" tabindex="-1">
      <div data-app-section="ConversationContainer" class="Q8TCC yyYQP">
        <div class="ZOM9m">
          <!-- Message container with .aVla3 class -->
          <div class="aVla3">
            <div aria-expanded="true" class="BS0OK">
              <div class="wide-content-host">
                <div tabindex="-1" aria-label="Email message" class="SlLx9 WWy1F">
                  <!-- Message body -->
                  <div role="document">
                    <div id="UniqueMessageBody_2" aria-label="Message body" class="XbIp4 jmmB7">
                      <div class="BIZfh">
                        <p>Encrypted files attached.</p>
                      </div>
                    </div>
                  </div>

                  <!-- Attachments section with encrypted files -->
                  <div class="T3idP kQkuc">
                    <div tabindex="-1" class="RrjjU sBuNd disableTextSelection">
                      <div role="listbox" aria-label="Attachments" class="E_kRz srnS5">
                        <div class="Y0d3P">
                          <div class="av-container">
                            <!-- Encrypted file .gpg -->
                            <div role="option"
                                 aria-label="secret-document.pdf.gpg Open 45 KB"
                                 tabindex="0"
                                 class="GpKSR C1V5C WM3Zr ERPBZ noneDensity">
                              <div draggable="true">
                                <div class="feh0T">
                                  <div class="JA9Uf YyULm">
                                    <i data-icon-name="document20_svg" class="WwCcl root-420">
                                      <img src="//res.../document.svg" alt="">
                                    </i>
                                    <div class="uDIro">
                                      <div class="">
                                        <div class="VlyYV PQeLQ QEiYT" title="secret-document.pdf.gpg">secret-document.pdf.gpg</div>
                                        <div title="45 KB">
                                          <span class="rc4Lo QxTLU puwJz QEiYT">45 KB</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <!-- Encrypted file .pgp -->
                            <div role="option"
                                 aria-label="confidential.txt.pgp Open 12 KB"
                                 tabindex="0"
                                 class="GpKSR C1V5C WM3Zr ERPBZ noneDensity">
                              <div draggable="true">
                                <div class="feh0T">
                                  <div class="JA9Uf YyULm">
                                    <i data-icon-name="document20_svg" class="WwCcl root-420">
                                      <img src="//res.../document.svg" alt="">
                                    </i>
                                    <div class="uDIro">
                                      <div class="">
                                        <div class="VlyYV PQeLQ QEiYT" title="confidential.txt.pgp">confidential.txt.pgp</div>
                                        <div title="12 KB">
                                          <span class="rc4Lo QxTLU puwJz QEiYT">12 KB</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <!-- Encrypted file .asc -->
                            <div role="option"
                                 aria-label="message.asc Open 8 KB"
                                 tabindex="0"
                                 class="GpKSR C1V5C WM3Zr ERPBZ noneDensity">
                              <div draggable="true">
                                <div class="feh0T">
                                  <div class="JA9Uf YyULm">
                                    <i data-icon-name="document20_svg" class="WwCcl root-420">
                                      <img src="//res.../document.svg" alt="">
                                    </i>
                                    <div class="uDIro">
                                      <div class="">
                                        <div class="VlyYV PQeLQ QEiYT" title="message.asc">message.asc</div>
                                        <div title="8 KB">
                                          <span class="rc4Lo QxTLU puwJz QEiYT">8 KB</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  /**
   * User mailbox element (primary mailbox root)
   * Location: Left sidebar navigation where user's email is displayed
   *
   * Based on actual Outlook structure with id starting with "primaryMailboxRoot_"
   * Contains user's email in data-folder-name and title attributes
   */
  userMailbox: `
    <div id="primaryMailboxRoot_DEFDEFDE-FDEF-DEFD-EFDE-FDEFDEFDEFDE-00030000B0BF7BF7@84df9e7f-e9f6-40af-b435-aaaaaaaaaaaa"
         class="XVsEB LPIso oTkSL fP63B phvtt z6Kje"
         data-is-focusable="true"
         title="toberndo@outlook.com"
         tabindex="0"
         role="treeitem"
         aria-expanded="true"
         aria-level="1"
         data-folder-name="toberndo@outlook.com"
         data-tabster='{"restorer":{"type":1}}'
         style="padding-left: 0px; width: auto;">
      <button type="button"
              data-is-focusable="false"
              tabindex="-1"
              class="fui-Button r1alrhcs gJcOF x47ff ___5ap6rb0 f1c21dwh f1p3nwhy f11589ue f1q5o8ev f1pdflbu fkfq4zb fjxutwb f1s2uweq fr80ssc f1ukrpxl fecsdlb f139oj5f ft1hn21 fuxngvv fwiml72 f1h0usnq fs4ktlq f16h9ulv fx2bmrt f1fg1p5m f1dfjoow f1j98vj9 f1tme0vf f4xjyn1 f18onu3q f9ddjv3 f17fgpbq fu97m5z ft85np5 fy9rknc figsok6 fwrc4pm fazmxh f1jt17bm"
              role="button"
              aria-hidden="true">
        <span class="fui-Button__icon rywnvv2 ___hix1za0 fe5j1ua fjamq6b f64fuq3 fbaiahx">
          <i class="fui-Icon-font jgnYx psaT8 VuFmm VGV9k ___qaf4230 f14t3ns0 fne0op0 fmd4ok8 f303qgw f1sxfq9t"
             font-size="12px"
             fill="currentColor"
             aria-hidden="true"></i>
        </span>
      </button>
      <span class="gtcPn _8g73 LPIso qWi7V _Ptr3">toberndo@outlook.com</span>
    </div>
  `
};
