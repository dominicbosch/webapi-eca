$( document ).ready(function() {
  var menubar = $( '#menubar tr' );

  var fCreateLink = function( text, href ) {
    var link = $( '<td>' );
    link.append( $( '<a>' ).text( text ).attr( 'href', href ) );
    menubar.append( link );
  };

  fCreateLink( 'Push Event', 'forge?page=forge_event' );
  fCreateLink( 'Create Rule', 'forge?page=forge_rule' );
  fCreateLink( 'Create Webhooks', 'forge?page=forge_webhook' );
  fCreateLink( 'Edit Rules', 'forge?page=edit_rules' );
  fCreateLink( 'Create ET', 'forge?page=forge_module&type=event_trigger' );
  fCreateLink( 'Create AD', 'forge?page=forge_module&type=action_dispatcher' );
  fCreateLink( 'Edit ETs & ADs', 'forge?page=edit_modules' );

  var link = $( '<td>' );
  link.append( $( '<a>' ).text( 'Logout' )
    .click( function() {
      $.post( '/session/logout' ).done( function() {
        window.location.href = document.URL;
      });
    })
  );
  menubar.append( link );
});