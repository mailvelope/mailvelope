/**
 * Mock Gmail DOM structures for testing
 * Based existing GmailIntegration
 *
 * Purpose: Provide realistic Gmail DOM structures for integration testing
 * without requiring authentication or network access.
 *
 * Usage: Import these templates in integration tests to create mock Gmail DOM
 */

export const GmailDOMTemplates = {
  /**
   * Compose button area
   * Location: Navigation sidebar where Mailvelope button should be injected
   * Source: gmailIntegration.js:87-117
   */
  composeArea: `
    <div class="aIH">
      <div class="aic">
        <div class="z0">
          <div class="T-I J-J5-Ji T-I-KE L3" role="button" tabindex="0" aria-label="Compose">
            Compose
          </div>
          <!-- Mailvelope button injected here by attachEditorBtn() -->
        </div>
      </div>
    </div>
  `,

  /**
   * Compose button area (Meet variant)
   * Alternative layout when Meet section is active in main menu
   * Source: gmailIntegration.js:106-117
   */
  composeAreaMeet: `
    <div class="aeN">
      <div class="Yh akV" tabindex="0" role="button" style="background-color: #fff; border-radius: 50%; box-shadow: 0 1px 2px 0 rgba(60,64,67,.302);">
        <span>New message</span>
      </div>
      <!-- Mailvelope button injected before this element -->
    </div>
  `,

  /**
   * Message with PGP content
   * Source: gmailIntegration.js message scanning logic
   */
  messageWithPGP: `
    <div class="gs" data-message-id="msg-18c9a123abc">
      <div class="cf ix">
        <span email="sender@example.com">Sender Name</span>
      </div>
      <table>
        <tr>
          <td class="acX bAm">
            <!-- Top action buttons area -->
            <div class="T-I J-J5-Ji" role="button">Reply</div>
            <div class="T-I J-J5-Ji" role="button">Forward</div>
          </td>
        </tr>
      </table>
      <div class="ii gt">
        <div class="a3s aXjCH">
          <pre>
-----BEGIN PGP MESSAGE-----
Version: Mailvelope v6.2.0

hQEMA1234567890ABCdef
ghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh
ijklmnopqrstuvwxyz1234567890
=ABCD
-----END PGP MESSAGE-----
          </pre>
          <div class="iX">
            <a href="#view=lg">
              [Message clipped] View entire message
            </a>
          </div>
        </div>
      </div>
      <div class="btC">
        <div class="T-I J-J5-Ji" role="button">
          <span>Reply</span>
        </div>
        <div class="T-I J-J5-Ji" role="button">
          <span>Forward</span>
        </div>
        <!-- Mailvelope secure action buttons injected here -->
      </div>
    </div><div class="gE iv gt"><span class="ams" role="link">Reply</span><span class="ams" role="link">Forward</span></div>
  `,

  /**
   * Message with encrypted attachment
   * Source: gmailIntegration.js:241-250
   */
  messageWithEncryptedAttachment: `
    <div class="gs" data-message-id="msg-456def789">
      <div class="cf ix">
        <span email="alice@example.com">Alice Smith</span>
      </div>
      <table>
        <tr>
          <td class="acX bAm">
            <div class="T-I J-J5-Ji" role="button">Reply</div>
            <div class="T-I J-J5-Ji" role="button">Forward</div>
          </td>
        </tr>
      </table>
      <div class="ii gt">
        <div class="a3s aiL">
          <p>Please see the attached encrypted file.</p>
        </div>
      </div>
      <div class="aQA">
        <div class="aZo" data-filename="secret-document.txt.gpg">
          <span class="aV3">secret-document.txt.gpg</span>
          <span class="aQG">12 KB</span>
        </div>
        <div class="aZo" data-filename="report.pdf.pgp">
          <span class="aV3">report.pdf.pgp</span>
          <span class="aQG">256 KB</span>
        </div>
      </div>
      <div class="btC">
        <div class="T-I J-J5-Ji" role="button">Reply</div>
        <div class="T-I J-J5-Ji" role="button">Forward</div>
      </div>
    </div>
  `,

  /**
   * Message with clipped content (too long for Gmail to display fully)
   * Source: gmailIntegration.js:227-234
   */
  messageWithClippedContent: `
    <div class="gs" data-message-id="msg-789abc012">
      <div class="cf ix">
        <span email="bob@example.com">Bob Jones</span>
      </div>
      <div class="ii gt">
        <div class="a3s aXjCH">
          <p>Beginning of message...</p>
          <div class="iX">
            <a href="#view=lg">
              <img src="//ssl.gstatic.com/ui/v1/icons/mail/images/cleardot.gif">
              [Message clipped] View entire message
            </a>
          </div>
        </div>
      </div>
      <div class="btC">
        <div class="T-I J-J5-Ji" role="button">Reply</div>
      </div>
    </div>
  `,

  /**
   * Message with clipped PGP content
   * Combination of clipped content and PGP message
   */
  messageWithClippedPGP: `
    <div class="gs" data-message-id="msg-clipped-pgp">
      <div class="cf ix">
        <span email="charlie@example.com">Charlie Brown</span>
      </div>
      <table>
        <tr>
          <td class="acX bAm">
            <div class="T-I J-J5-Ji" role="button">Reply</div>
          </td>
        </tr>
      </table>
      <div class="ii gt">
        <div class="a3s aXjCH">
          <pre>
-----BEGIN PGP MESSAGE-----

hQEMA1234567890ABCdef
...content...
          </pre>
          <div class="iX">
            <a href="#view=lg">
              [Message clipped] View entire message
            </a>
          </div>
        </div>
      </div>
    </div><div class="gE iv gt"><span class="ams" role="link">Reply</span></div>
  `,

  /**
   * Multiple messages (inbox view)
   * Useful for testing message scanning
   */
  inboxWithMultipleMessages: `
    <div class="AO">
      <div class="gs" data-message-id="msg-001">
        <div class="cf ix"><span email="user1@example.com">User 1</span></div>
        <table><tr><td class="acX bAm"><div class="T-I J-J5-Ji" role="button">Reply</div></td></tr></table>
        <div class="ii gt"><div class="a3s aXjCH"><p>Plain message 1</p></div></div>
      </div>
      <div class="gs" data-message-id="msg-002">
        <div class="cf ix"><span email="user2@example.com">User 2</span></div>
        <table><tr><td class="acX bAm"><div class="T-I J-J5-Ji" role="button">Reply</div></td></tr></table>
        <div class="ii gt">
          <div class="a3s aXjCH">
            <pre>-----BEGIN PGP MESSAGE-----
hQEMA1234567890ABC
=ABCD
-----END PGP MESSAGE-----</pre>
          </div>
        </div>
      </div>
      <div class="gs" data-message-id="msg-003">
        <div class="cf ix"><span email="user3@example.com">User 3</span></div>
        <table><tr><td class="acX bAm"><div class="T-I J-J5-Ji" role="button">Reply</div></td></tr></table>
        <div class="ii gt"><div class="a3s aiL"><p>Plain message 2</p></div></div>
        <div class="aQA">
          <div class="aZo"><span class="aV3">document.pdf.asc</span></div>
        </div>
      </div>
    </div>
  `,

  /**
   * User info in page title (for email extraction)
   * Source: gmailIntegration.js:49-62
   */
  pageTitle: `
    <title>Inbox (3) - alice@example.com - Gmail</title>
  `,

  /**
   * Legacy G Suite storage indicator
   * Source: gmailIntegration.js:60
   */
  legacyGSuiteIndicator: `
    <div class="aiG">
      <div class="aiD">
        <span>15 GB of 15 GB used</span>
      </div>
    </div>
  `
};
