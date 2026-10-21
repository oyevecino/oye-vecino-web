/* Vistas previas del panel: muestran cada sección como se verá en la web. */
(function(){
  if (!window.CMS || !window.h || !window.createClass) return;
  var h = window.h;

  var MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var eur = new Intl.NumberFormat('es-ES', {style:'currency', currency:'EUR', maximumFractionDigits:0, useGrouping:'always'});
  var eur2 = new Intl.NumberFormat('es-ES', {style:'currency', currency:'EUR', maximumFractionDigits:2, useGrouping:'always'});
  var longDate = new Intl.DateTimeFormat('es-ES', {day:'numeric', month:'long', year:'numeric'});

  function num(v){ return (v === '' || v == null || isNaN(Number(v))) ? null : Number(v); }
  function parseDate(s){
    var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function list(entry, key){
    var v = entry.getIn(['data', key]);
    return v && v.toJS ? v.toJS() : (v || []);
  }
  function asset(props, path){
    if (!path) return '';
    var a = props.getAsset(path);
    return a ? a.toString() : path;
  }
  function header(kicker, title, note){
    return [
      h('div', {className:'pv-kicker', key:'k'}, kicker),
      h('h2', {className:'pv-title', key:'t'}, title),
      note ? h('p', {className:'pv-note', key:'n'}, note) : null
    ];
  }

  /* ---------- Acciones ---------- */
  var AccionesPreview = window.createClass({
    render: function(){
      var props = this.props;
      var today = new Date(); today.setHours(0,0,0,0);
      var items = list(props.entry, 'eventos').map(function(e){ e._d = parseDate(e.fecha); return e; })
        .sort(function(a, b){ return (b._d || 0) - (a._d || 0); });
      return h('div', {},
        header('Lo que estamos haciendo', 'Nuestras acciones', 'Así se verán en la web, de la más reciente a la más antigua.'),
        items.length ? h('div', {className:'pv-actions'}, items.map(function(e, i){
          var d = e._d;
          return h('div', {className:'pv-action' + (e.destacado === false ? ' pv-off' : ''), key:i},
            h('div', {className:'pv-action__img', style: e.cover ? {backgroundImage:'url("' + asset(props, e.cover) + '")'} : {}},
              h('div', {className:'pv-chip'}, h('b', {}, d ? String(d.getDate()).padStart(2, '0') : '—'), h('span', {}, d ? MESES[d.getMonth()] + ' ' + d.getFullYear() : 'sin fecha'))),
            h('div', {className:'pv-action__body'},
              h('span', {className:'pv-tag'}, (d && d < today ? 'Realizada' : 'Próxima') + (e.tipo ? ' · ' + e.tipo : '')),
              h('h3', {}, e.nombre || 'Acción sin nombre'),
              e.bio ? h('p', {}, e.bio) : null,
              h('div', {className:'pv-meta'}, [d ? longDate.format(d) : '', e.hora || '', e.lugar || ''].filter(Boolean).join(' · ')),
              e.destacado === false ? h('div', {className:'pv-meta'}, 'No se destaca en la portada') : null));
        })) : h('div', {className:'pv-empty'}, 'Todavía no hay acciones. Pulsa «Añadir acción» para crear la primera.'));
    }
  });

  /* ---------- Recaudación ---------- */
  var RecaudacionPreview = window.createClass({
    render: function(){
      var rows = list(this.props.entry, 'registros').map(function(r){
        var costes = num(r.costes) || 0, bruto = num(r.bruto);
        var neto = num(r.neto) != null ? num(r.neto) : Math.max(0, (bruto || 0) - costes);
        var gastos = (r.desglose_gastos || []).reduce(function(s, g){ return s + (num(g.monto) || 0); }, 0);
        return {r:r, costes:costes, bruto:bruto, neto:neto, base:bruto || (neto + costes) || 1, gastos:gastos, d:parseDate(r.fecha)};
      }).sort(function(a, b){ return (b.d || 0) - (a.d || 0); });
      var total = rows.reduce(function(s, x){ return s + x.neto; }, 0);
      return h('div', {className:'pv-ledger'},
        h('div', {className:'pv-kicker'}, 'Transparencia'),
        h('div', {className:'pv-total-label'}, 'Total neto recaudado'),
        h('div', {className:'pv-total'}, eur.format(total)),
        rows.length ? h('div', {className:'pv-rows'}, rows.map(function(x, i){
          var pc = Math.min(100, Math.round(x.costes / x.base * 100));
          var warn = x.r.desglose_gastos && x.r.desglose_gastos.length && Math.abs(x.gastos - x.costes) > 0.009
            ? h('div', {className:'pv-warn'}, 'El desglose de gastos suma ' + eur2.format(x.gastos) + ' y los costes son ' + eur2.format(x.costes) + '. Revisa las cifras.') : null;
          return h('div', {className:'pv-row', key:i},
            h('div', {className:'pv-row__top'},
              h('div', {}, h('h3', {}, x.r.titulo || 'Registro sin título'), h('div', {className:'pv-legend'}, x.d ? longDate.format(x.d) : 'Sin fecha')),
              h('div', {className:'pv-net'}, eur.format(x.neto))),
            h('div', {className:'pv-bar'}, h('span', {className:'c', style:{width: pc + '%'}}), h('span', {className:'n', style:{width: (100 - pc) + '%'}})),
            h('div', {className:'pv-legend'},
              h('span', {}, 'Costes ' + eur.format(x.costes)),
              h('span', {}, 'Neto ' + eur.format(x.neto)),
              x.bruto != null ? h('span', {}, 'Bruto ' + eur.format(x.bruto)) : null),
            warn);
        })) : h('div', {className:'pv-empty', style:{marginTop:'20px', color:'rgba(255,255,255,.7)'}}, 'Todavía no hay registros. Pulsa «Añadir registro» para crear el primero.'));
    }
  });

  /* ---------- Equipo ---------- */
  var EquipoPreview = window.createClass({
    render: function(){
      var props = this.props;
      var team = list(props.entry, 'miembros');
      return h('div', {},
        header('Quiénes somos', 'Las personas detrás de Oye Vecino'),
        h('div', {className:'pv-team'}, team.map(function(m, i){
          return h('div', {className:'pv-member', key:i},
            h('div', {className:'pv-member__ph', style: m.foto ? {backgroundImage:'url("' + asset(props, m.foto) + '")'} : {}},
              m.frase ? h('span', {className:'pv-bubble'}, '«' + m.frase + '»') : null),
            h('h4', {}, m.nombre || 'Nombre'),
            h('p', {}, m.rol || 'Cargo'));
        })));
    }
  });

  /* ---------- Ajustes ---------- */
  var AjustesPreview = window.createClass({
    render: function(){
      var d = this.props.entry.getIn(['data']);
      var don = (d.get('donaciones') && d.get('donaciones').toJS()) || {};
      var bal = (d.get('balance') && d.get('balance').toJS()) || {};
      return h('div', {},
        header('Ajustes', 'Cómo se ve en la web'),
        h('div', {className:'pv-cards'},
          h('div', {className:'pv-card'},
            h('h3', {}, 'Donaciones ', h('span', {className:'pv-pill ' + (don.activas ? 'pv-pill--on' : 'pv-pill--off')}, don.activas ? 'Abiertas' : 'Próximamente')),
            h('p', {}, don.activas ? (don.texto || '') : 'Ya tenemos la asociación constituida. Pronto abriremos para que puedas donar de forma transparente y segura.'),
            don.activas && don.iban ? h('p', {}, 'IBAN: ', h('b', {}, don.iban)) : null,
            don.activas && don.bizum ? h('p', {}, 'Bizum: ', h('b', {}, don.bizum)) : null,
            h('span', {className:'pv-btn'}, don.activas ? 'Donar al proyecto' : 'Colabora con el proyecto')),
          h('div', {className:'pv-card'},
            h('h3', {}, 'Cifra del contexto'),
            h('div', {className:'pv-big'}, (num(bal.fallecidos) != null ? new Intl.NumberFormat('es-ES', {useGrouping:'always'}).format(bal.fallecidos) : '—'), h('span', {}, '+')),
            h('p', {}, 'Fallecidos según el último balance oficial (' + (bal.fecha || '…') + ').'))));
    }
  });

  CMS.registerPreviewStyle('https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;600;700;800&family=Hanken+Grotesk:wght@400;500;600&display=swap');
  CMS.registerPreviewStyle('/admin/preview.css');
  CMS.registerPreviewTemplate('eventos', AccionesPreview);
  CMS.registerPreviewTemplate('recaudacion', RecaudacionPreview);
  CMS.registerPreviewTemplate('equipo', EquipoPreview);
  CMS.registerPreviewTemplate('ajustes', AjustesPreview);
})();
