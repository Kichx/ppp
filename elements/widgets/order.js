/** @decorator */

import ppp from '../../ppp.js';
import {
  widgetStyles,
  WidgetWithInstrument,
  widgetWithInstrumentBodyTemplate
} from '../widget.js';
import { debounce } from '../../lib/ppp-decorators.js';
import {
  html,
  css,
  when,
  ref,
  observable,
  repeat,
  Updates
} from '../../vendor/fast-element.min.js';
import { WIDGET_TYPES, TRADER_DATUM, TRADER_CAPS } from '../../lib/const.js';
import {
  formatRelativeChange,
  formatAbsoluteChange,
  formatAmount,
  formatPrice,
  formatPriceWithoutCurrency,
  formatCommission,
  decSeparator,
  getInstrumentQuantityPrecision,
  stringToFloat
} from '../../lib/intl.js';
import {
  ellipsis,
  normalize,
  spacing,
  typography
} from '../../design/styles.js';
import { emptyWidgetState } from '../../static/svg/sprite.js';
import {
  fontSizeWidget,
  paletteBlack,
  paletteGrayBase,
  paletteGrayLight1,
  paletteGrayLight2,
  buy,
  themeConditional,
  toColorComponents,
  sell,
  paletteWhite,
  paletteGrayLight3,
  darken,
  positive,
  negative,
  spacing2
} from '../../design/design-tokens.js';
import { staticallyCompose } from '../../vendor/fast-utilities.js';
import { validate } from '../../lib/ppp-errors.js';
import '../button.js';
import '../checkbox.js';
import '../query-select.js';
import '../tabs.js';
import '../text-field.js';
import '../widget-controls.js';

const isLastPriceInHeaderHidden = (x) =>
  typeof x.document.showLastPriceInHeader === 'undefined'
    ? false
    : !x.document.showLastPriceInHeader;
const isAbsoluteChangeInHeaderHidden = (x) =>
  typeof x.document.showAbsoluteChangeInHeader === 'undefined'
    ? false
    : !x.document.showAbsoluteChangeInHeader;
const isRelativeChangeInHeaderHidden = (x) =>
  typeof x.document.showRelativeChangeInHeader === 'undefined'
    ? false
    : !x.document.showRelativeChangeInHeader;
const isBestBidAndAskHidden = (x) =>
  typeof x.document.showBestBidAndAsk === 'undefined'
    ? false
    : !x.document.showBestBidAndAsk;
const isEstimateSectionHidden = (x) => {
  if (x.orderTypeTabs.activeid === 'conditional' && !x.conditionalOrders) {
    return true;
  }

  return typeof x.document.showEstimateSection === 'undefined'
    ? false
    : !x.document.showEstimateSection;
};
const isAmountSectionHidden = (x) => {
  if (x.orderTypeTabs.activeid === 'conditional' && !x.conditionalOrders) {
    return true;
  }

  return typeof x.document.showAmountSection === 'undefined'
    ? false
    : !x.document.showAmountSection;
};
const isPriceAndQuantityHidden = (x) => {
  return x.orderTypeTabs.activeid === 'conditional' && !x.conditionalOrders;
};

export const orderWidgetTemplate = html`
  <template>
    <div class="widget-root">
      <div class="widget-header">
        <div class="widget-header-inner">
          <ppp-widget-group-control
            ?hidden="${(x) => !x.instrumentTrader}"
          ></ppp-widget-group-control>
          <ppp-widget-search-control
            ?hidden="${(x) => !x.instrumentTrader}"
          ></ppp-widget-search-control>
          <span class="widget-title">
            <span
              ?hidden="${(x) =>
                !(
                  isLastPriceInHeaderHidden(x) &&
                  isAbsoluteChangeInHeaderHidden(x) &&
                  isRelativeChangeInHeaderHidden(x)
                )}"
              class="title"
            >
              ${(x) => x.document?.name ?? ''}
            </span>
            ${when(
              (x) => x.instrument,
              html`
                <span
                  ?hidden="${(x) => isLastPriceInHeaderHidden(x)}"
                  class="price ${(x) =>
                    x.lastPriceAbsoluteChange < 0 ? 'negative' : 'positive'}"
                >
                  ${(x) => x.formatPrice(x.lastPrice)}
                </span>
                <span
                  ?hidden="${(x) => isAbsoluteChangeInHeaderHidden(x)}"
                  class="${(x) =>
                    x.lastPriceAbsoluteChange < 0 ? 'negative' : 'positive'}"
                >
                  ${(x) =>
                    formatAbsoluteChange(
                      x.lastPriceAbsoluteChange,
                      x.instrument
                    )}
                </span>
                <span
                  ?hidden="${(x) => isRelativeChangeInHeaderHidden(x)}"
                  class="${(x) =>
                    x.lastPriceAbsoluteChange < 0 ? 'negative' : 'positive'}"
                >
                  ${(x) =>
                    formatRelativeChange(x.lastPriceRelativeChange / 100)}
                </span>
              `
            )}
          </span>
          <ppp-widget-header-buttons
            ${ref('headerButtons')}
          ></ppp-widget-header-buttons>
        </div>
      </div>
      <div class="widget-body">
        ${widgetWithInstrumentBodyTemplate(html`
          <ppp-widget-tabs
            ?hidden="${(x) =>
              typeof x.document.showOrderTypeTabs === 'undefined'
                ? false
                : !x.document.showOrderTypeTabs}"
            activeid="${(x) => x.getActiveWidgetTab()}"
            @change="${(x, { event }) =>
              x.updateDocumentFragment({
                $set: {
                  'widgets.$.activeTab': event.detail.id
                }
              })}"
            ${ref('orderTypeTabs')}
          >
            <ppp-widget-tab id="market">Рыночная</ppp-widget-tab>
            <ppp-widget-tab id="limit">Лимитная</ppp-widget-tab>
            <ppp-widget-tab id="conditional"> Условная</ppp-widget-tab>
            <ppp-tab-panel id="market-panel"></ppp-tab-panel>
            <ppp-tab-panel id="limit-panel"></ppp-tab-panel>
            <ppp-tab-panel id="conditional-panel"></ppp-tab-panel>
          </ppp-widget-tabs>
          <div class="widget-body-inner">
            <div class="company-card">
              <div class="company-card-item">
                <span
                  title="${(x) => x.instrument?.fullName}"
                  class="company-name"
                >
                  ${(x) => x.instrument?.fullName}
                </span>
                <span
                  @click="${(x) => x.setPrice(x.lastPrice)}"
                  class="company-last-price ${(x) =>
                    x.lastPriceAbsoluteChange < 0 ? 'negative' : 'positive'}"
                >
                  ${(x) => x.formatPrice(x.lastPrice)}
                </span>
              </div>
              <div class="company-card-item">
                <span
                  style="cursor: pointer"
                  @click="${(x) => x.setQuantity(Math.abs(x.positionSize))}"
                >
                  В портфеле: ${(x) => x.formatPositionSize()}
                </span>
                <span
                  style="cursor: pointer"
                  @click="${(x) => x.setPrice(x.positionAverage ?? 0)}"
                >
                  Средняя: ${(x) => x.formatPrice(x.positionAverage ?? 0)}
                </span>
              </div>
            </div>
            <div ?hidden="${(x) => isBestBidAndAskHidden(x)}" class="nbbo-line">
              <div
                class="nbbo-line-bid"
                @click="${(x) => x.setPrice(x.bestBid)}"
              >
                Bid ${(x) => x.formatPrice(x.bestBid)}
                <div
                  @click="${(x, { event }) => event.stopPropagation()}"
                  class="nbbo-line-icon-holder"
                >
                  <div class="nbbo-line-icon-fallback">
                    <div
                      class="nbbo-line-icon-logo"
                      style="${(x) =>
                        `background-image:url(${x.searchControl.getInstrumentIconUrl(
                          x.instrument
                        )})`}"
                    ></div>
                    ${(x) => x.instrument?.fullName[0]}
                  </div>
                </div>
              </div>
              <div
                class="nbbo-line-ask"
                @click="${(x) => x.setPrice(x.bestAsk)}"
              >
                Ask ${(x) => x.formatPrice(x.bestAsk)}
              </div>
            </div>
            ${when(
              (x) => isBestBidAndAskHidden(x),
              html` <div class="widget-margin-spacer"></div>`
            )}
            ${when(
              (x) =>
                x.orderTypeTabs.activeid === 'conditional' &&
                !x.conditionalOrders,
              html`
                <div class="widget-empty-state-holder">
                  ${staticallyCompose(emptyWidgetState)}
                  <span>
                    <div class="no-conditional-orders-holder">
                      <span>Условные заявки не настроены.</span>
                      <a
                        class="link"
                        href="javascript:void(0);"
                        @click="${(x) => x.headerButtons.showWidgetSettings()}"
                      >
                        Открыть параметры.
                      </a>
                    </div>
                  </span>
                </div>
              `
            )}
            <div
              class="widget-price-quantity"
              ?hidden="${(x) => isPriceAndQuantityHidden(x)}"
            >
              <div class="widget-section">
                <div class="widget-subsection">
                  <div class="widget-subsection-item">
                    <div
                      ?hidden="${(x) => isBestBidAndAskHidden(x)}"
                      class="widget-text-label"
                    >
                      Цена исполнения
                    </div>
                    <ppp-widget-trifecta-field
                      kind="price"
                      :instrument="${(x) => x.instrument}"
                      :changeViaMouseWheel="${(x) =>
                        x.document.changePriceQuantityViaMouseWheel}"
                      ?market="${(x) => x.orderTypeTabs.activeid === 'market'}"
                      value="${(x) =>
                        formatPriceWithoutCurrency(x.document?.lastPrice)}"
                      @pppstep="${(x) => {
                        if (
                          typeof x?.fastVolumeButtons?.value !== 'undefined'
                        ) {
                          const radio =
                            x?.fastVolumeButtons.slottedRadioButtons.find(
                              (b) => b.value === x.fastVolumeButtons.value
                            );

                          x.setQuantityFromFastButtonRadio(radio);
                        }

                        x.calculateTotalAmount();
                        x.saveLastPriceValueDelayed();
                      }}"
                      @keydown=${(x, { event }) => {
                        x.handleHotkeys(event);

                        return true;
                      }}
                      @input=${(x) => {
                        if (
                          typeof x?.fastVolumeButtons?.value !== 'undefined'
                        ) {
                          const radio =
                            x?.fastVolumeButtons.slottedRadioButtons.find(
                              (b) => b.value === x.fastVolumeButtons.value
                            );

                          x.setQuantityFromFastButtonRadio(radio);
                        }

                        x.calculateTotalAmount();
                        x.saveLastPriceValueDelayed();
                      }}
                      ${ref('price')}
                    ></ppp-widget-trifecta-field>
                  </div>
                  <div class="widget-subsection-item">
                    <div
                      ?hidden="${(x) => isBestBidAndAskHidden(x)}"
                      class="widget-text-label"
                    >
                      Количество
                    </div>
                    <ppp-widget-trifecta-field
                      kind="quantity"
                      :instrument="${(x) => x.instrument}"
                      :changeViaMouseWheel="${(x) =>
                        x.document.changePriceQuantityViaMouseWheel}"
                      value="${(x) => x.document?.lastQuantity || ''}"
                      @pppstep="${(x) => {
                        x.calculateTotalAmount(false);
                        x.saveLastQuantityValue();
                      }}"
                      @keydown=${(x, { event }) => {
                        x.handleHotkeys(event);

                        return true;
                      }}
                      @input=${(x) => {
                        x.calculateTotalAmount(false);
                        x.saveLastQuantityValue();
                      }}
                      ${ref('quantity')}
                    ></ppp-widget-trifecta-field>
                  </div>
                </div>
              </div>
              ${when(
                (x) =>
                  x.instrument &&
                  x.ordersTrader &&
                  (x.ordersTrader.hasCap(TRADER_CAPS.CAPS_ORDER_DESTINATION) ||
                    x.ordersTrader.hasCap(TRADER_CAPS.CAPS_ORDER_TIF)),
                html`
                  <div class="widget-section">
                    <div class="widget-margin-spacer"></div>
                    <div class="widget-subsection">
                      ${when(
                        (x) =>
                          x.ordersTrader.hasCap(
                            TRADER_CAPS.CAPS_ORDER_DESTINATION
                          ),
                        html`
                          <div class="widget-subsection-item">
                            <div class="widget-text-label">Назначение</div>
                            <div class="widget-flex-line">
                              <ppp-widget-select
                                ${ref('destination')}
                                position="above"
                                @change="${(x) => {
                                  return x.updateDocumentFragment({
                                    $set: {
                                      'widgets.$.lastDestination':
                                        x.destination.value
                                    }
                                  });
                                }}"
                                value="${(x) =>
                                  x.document.lastDestination ?? 'SMART'}"
                              >
                                <ppp-widget-option value="SMART">
                                  SMART
                                </ppp-widget-option>
                                <ppp-widget-option value="AMEX">
                                  AMEX
                                </ppp-widget-option>
                                <ppp-widget-option value="ARCA">
                                  ARCA
                                </ppp-widget-option>
                                <ppp-widget-option value="BATS">
                                  BATS
                                </ppp-widget-option>
                                <ppp-widget-option value="BEX">
                                  BEX
                                </ppp-widget-option>
                                <ppp-widget-option value="BYX">
                                  BYX
                                </ppp-widget-option>
                                <ppp-widget-option value="CBOE">
                                  CBOE
                                </ppp-widget-option>
                                <ppp-widget-option value="CHX">
                                  CHX
                                </ppp-widget-option>
                                <ppp-widget-option value="DRCTEDGE">
                                  DRCTEDGE
                                </ppp-widget-option>
                                <ppp-widget-option value="EDGEA">
                                  EDGEA
                                </ppp-widget-option>
                                <ppp-widget-option value="EDGX">
                                  EDGX
                                </ppp-widget-option>
                                <ppp-widget-option value="IBKRATS">
                                  IBKRATS
                                </ppp-widget-option>
                                <ppp-widget-option value="IEX">
                                  IEX
                                </ppp-widget-option>
                                <ppp-widget-option value="ISE">
                                  ISE
                                </ppp-widget-option>
                                <ppp-widget-option value="ISLAND">
                                  ISLAND
                                </ppp-widget-option>
                                <ppp-widget-option value="LTSE">
                                  LTSE
                                </ppp-widget-option>
                                <ppp-widget-option value="MEMX">
                                  MEMX
                                </ppp-widget-option>
                                <ppp-widget-option value="NYSE">
                                  NYSE
                                </ppp-widget-option>
                                <ppp-widget-option value="NYSENAT">
                                  NYSENAT
                                </ppp-widget-option>
                                <ppp-widget-option value="OVERNIGHT">
                                  OVERNIGHT
                                </ppp-widget-option>
                                <ppp-widget-option value="PEARL">
                                  PEARL
                                </ppp-widget-option>
                                <ppp-widget-option value="PHLX">
                                  PHLX
                                </ppp-widget-option>
                                <ppp-widget-option value="PSX">
                                  PSX
                                </ppp-widget-option>
                                <ppp-widget-option value="TPLUS1">
                                  TPLUS1
                                </ppp-widget-option>
                              </ppp-widget-select>
                            </div>
                          </div>
                        `
                      )}
                      ${when(
                        (x) =>
                          x.ordersTrader.hasCap(TRADER_CAPS.CAPS_ORDER_TIF),
                        html`
                          <div class="widget-subsection-item">
                            <div class="widget-text-label">TIF</div>
                            <div class="widget-flex-line">
                              <ppp-widget-select
                                ${ref('tif')}
                                position="above"
                                @change="${(x) => {
                                  return x.updateDocumentFragment({
                                    $set: {
                                      'widgets.$.lastTif': x.tif.value
                                    }
                                  });
                                }}"
                                value="${(x) => x.document.lastTif ?? 'DAY'}"
                              >
                                <ppp-widget-option value="DAY">
                                  DAY
                                </ppp-widget-option>
                                <ppp-widget-option value="GTC">
                                  GTC
                                </ppp-widget-option>
                                <ppp-widget-option value="IOC">
                                  IOC
                                </ppp-widget-option>
                              </ppp-widget-select>
                            </div>
                          </div>
                        `
                      )}
                    </div>
                  </div>
                `
              )}
              <div class="widget-margin-spacer"></div>
              ${when(
                (x) => x.document.fastVolumes,
                html`
                  <div class="widget-section">
                    <ppp-widget-box-radio-group
                      wrap
                      readonly
                      class="fast-volume-selector"
                      value="${(x) =>
                        x.document.doNotLockFastVolume
                          ? void 0
                          : x.document.selectedFastVolume}"
                      @click="${(x, c) => x.handleFastVolumeClick(c)}"
                      @dblclick="${(x, c) => x.handleFastVolumeDblClick(c)}"
                      ${ref('fastVolumeButtons')}
                    >
                      ${repeat(
                        (x) => x.getFastVolumeButtonsData(),
                        html`
                          <ppp-widget-box-radio
                            class="xsmall"
                            value="${(x, c) => c.index}"
                            volume="${(x) => x.volume}"
                            ?money="${(x) => x.isInMoney}"
                          >
                            ${when(
                              (x) => x.isInMoney,
                              html` <div class="coin-icon"></div> `
                            )}
                            ${(x) => x.text}
                          </ppp-widget-box-radio>
                        `,
                        { positioning: true }
                      )}
                    </ppp-widget-box-radio-group>
                  </div>
                  <div class="widget-margin-spacer"></div>
                `
              )}
              <div
                ?hidden="${(x) => isAmountSectionHidden(x)}"
                class="widget-section"
              >
                <div class="widget-summary">
                  <div class="widget-summary-line">
                    <span>Стоимость</span>
                    <span class="widget-summary-line-price">
                      ${(x) =>
                        x.orderTypeTabs.activeid === 'market'
                          ? 'по факту сделки'
                          : formatAmount(
                              x.totalAmount,
                              x.instrument?.currency,
                              x.instrument
                            )}
                    </span>
                  </div>
                  <div class="widget-summary-line">
                    <span>Комиссия</span>
                    <span>
                      ${(x) =>
                        x.orderTypeTabs.activeid === 'market'
                          ? 'по факту сделки'
                          : formatCommission(x.commission, x.instrument)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="widget-footer">
            <div
              ?hidden="${(x) => isEstimateSectionHidden(x)}"
              class="widget-section"
            >
              <div class="widget-subsection">
                <div class="widget-summary">
                  <div
                    class="widget-summary-line"
                    style="cursor:pointer;"
                    @click="${(x) =>
                      x.setQuantity(x.buyingPowerQuantity ?? 0, {
                        force: true
                      })}"
                  >
                    <span>Доступно</span>
                    <span class="positive">
                      ${(x) => x.buyingPowerQuantity ?? '—'}
                    </span>
                  </div>
                  <div
                    class="widget-summary-line"
                    style="cursor:pointer;"
                    @click="${(x) =>
                      x.setQuantity(x.marginBuyingPowerQuantity ?? 0, {
                        force: true
                      })}"
                  >
                    <span>С плечом</span>
                    <span class="positive">
                      ${(x) => x.marginBuyingPowerQuantity ?? '—'}
                    </span>
                  </div>
                </div>
                <div class="widget-summary">
                  <div
                    class="widget-summary-line"
                    style="cursor:pointer;"
                    @click="${(x) =>
                      x.setQuantity(x.sellingPowerQuantity ?? 0, {
                        force: true
                      })}"
                  >
                    <span>Доступно</span>
                    <span class="negative">
                      ${(x) => x.sellingPowerQuantity ?? '—'}
                    </span>
                  </div>
                  <div
                    class="widget-summary-line"
                    style="cursor:pointer;"
                    @click="${(x) =>
                      x.setQuantity(x.marginSellingPowerQuantity ?? 0, {
                        force: true
                      })}"
                  >
                    <span>С плечом</span>
                    <span class="negative">
                      ${(x) => x.marginSellingPowerQuantity ?? '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div
              ?hidden="${(x) => isEstimateSectionHidden(x)}"
              class="widget-section-spacer"
            ></div>
            <div class="widget-section">
              <div class="widget-subsection">
                <ppp-widget-button
                  appearance="primary"
                  ?disabled="${(x) => {
                    if (
                      !x.conditionalOrder &&
                      x.orderTypeTabs.activeid === 'conditional'
                    ) {
                      return true;
                    }

                    return false;
                  }}"
                  @click="${(x) => x.buyOrSell('buy')}"
                >
                  Покупка
                </ppp-widget-button>
                <ppp-widget-button
                  appearance="danger"
                  ?disabled="${(x) => {
                    if (
                      !x.conditionalOrder &&
                      x.orderTypeTabs.activeid === 'conditional'
                    ) {
                      return true;
                    }

                    return false;
                  }}"
                  @click="${(x) => x.buyOrSell('sell')}"
                >
                  Продажа
                </ppp-widget-button>
              </div>
            </div>
          </div>
        `)}
        <ppp-widget-notifications-area></ppp-widget-notifications-area>
      </div>
      <ppp-widget-resize-controls></ppp-widget-resize-controls>
    </div>
  </template>
`;

export const orderWidgetStyles = css`
  ${normalize()}
  ${widgetStyles()}
  ${typography()}
  ${spacing()}
  :host ppp-widget-notifications-area {
    bottom: 55px;
  }

  .widget-body-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .no-conditional-orders-holder {
    display: flex;
    align-items: center;
    flex-direction: column;
    margin-bottom: ${spacing2};
    overflow: hidden;
  }

  .conditional-orders-tabs {
    z-index: 1;
    display: flex;
    align-items: center;
  }

  .conditional-orders-tabs .tabs {
    padding: 0 10px 4px;
  }

  div.widget-empty-state-holder + ppp-widget-notifications-area {
    bottom: 20px;
  }

  .company-card {
    width: 100%;
    padding: 10px 10px 0;
    font-size: ${fontSizeWidget};
    text-align: left;
  }

  .company-card-item {
    color: ${themeConditional(paletteGrayBase, paletteGrayLight1)};
    display: flex;
    align-items: center;
    line-height: 20px;
    justify-content: space-between;
  }

  .company-card-item:first-child {
    color: ${themeConditional(paletteBlack, paletteGrayLight2)};
    font-size: calc(${fontSizeWidget} + 4px);
  }

  .company-name {
    font-weight: bold;
    max-width: 70%;
    padding-right: ${spacing2};
    ${ellipsis()};
  }

  .company-last-price {
    white-space: nowrap;
    cursor: pointer;
  }

  .nbbo-line {
    display: flex;
    width: 100%;
    font-size: calc(${fontSizeWidget} + 1px);
    line-height: 22px;
    padding: 10px;
    font-weight: 500;
  }

  .nbbo-line-bid {
    flex: 1 1 0;
    color: ${positive};
    cursor: pointer;
    padding: 2px 10px;
    position: relative;
    background-color: rgba(${toColorComponents(buy)}, 0.2);
    text-align: left;
    border-bottom-left-radius: 4px;
    border-top-left-radius: 4px;
  }

  .nbbo-line-ask {
    flex: 1 1 0;
    color: ${negative};
    cursor: pointer;
    padding: 2px 10px;
    background-color: rgba(${toColorComponents(sell)}, 0.2);
    text-align: right;
    border-bottom-right-radius: 4px;
    border-top-right-radius: 4px;
  }

  .nbbo-line-icon-holder {
    cursor: default;
    top: 0;
    right: 0;
    bottom: 0;
    padding: 2px;
    position: absolute;
    transform: translate(50%, 0px);
    background-color: ${themeConditional(paletteWhite, paletteBlack)};
    border-radius: 50%;
    font-weight: 500;
  }

  .nbbo-line-icon-fallback {
    display: flex;
    position: relative;
    justify-content: center;
    align-items: center;
    color: ${themeConditional(paletteGrayBase, paletteGrayLight1)};
    background-color: ${themeConditional(
      darken(paletteGrayLight3, 5),
      paletteBlack
    )};
    width: 22px;
    height: 22px;
    border-radius: 50%;
    overflow-wrap: break-word;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .nbbo-line-icon-logo {
    position: absolute;
    width: 22px;
    height: 22px;
    left: 0;
    top: 0;
    border-radius: 50%;
    background-size: 100%;
  }

  .coin-icon {
    background-image: url('static/svg/coin.svg');
    background-repeat: no-repeat;
    width: 12px;
    height: 12px;
    margin-right: 2px;
    pointer-events: none;
  }

  .widget-flex-line ppp-widget-text-field {
    width: 100%;
  }
`;

export class OrderWidget extends WidgetWithInstrument {
  /** @type {WidgetNotificationsArea} */
  notificationsArea;

  @observable
  ordersTrader;

  @observable
  level1Trader;

  @observable
  extraLevel1Trader;

  @observable
  extraLevel1Trader2;

  @observable
  traderEvent;

  @observable
  lastPrice;

  @observable
  lastPriceAbsoluteChange;

  @observable
  lastPriceRelativeChange;

  @observable
  bestBid;

  @observable
  bestAsk;

  @observable
  totalAmount;

  @observable
  commission;

  @observable
  buyingPowerQuantity;

  @observable
  marginBuyingPowerQuantity;

  @observable
  sellingPowerQuantity;

  @observable
  marginSellingPowerQuantity;

  @observable
  positionSize;

  @observable
  positionAverage;

  @observable
  conditionalOrder;

  @observable
  conditionalOrders;

  async connectedCallback() {
    super.connectedCallback();

    if (!this.document.ordersTrader) {
      return this.notificationsArea.error({
        text: 'Отсутствует трейдер для выставления заявок.',
        keep: true
      });
    }

    if (!this.document.level1Trader) {
      return this.notificationsArea.error({
        text: 'Отсутствует трейдер данных L1.',
        keep: true
      });
    }

    try {
      this.ordersTrader = await ppp.getOrCreateTrader(
        this.document.ordersTrader
      );
      this.instrumentTrader = this.ordersTrader;

      this.selectInstrument(this.document.symbol, { isolate: true });

      if (typeof this.ordersTrader?.estimate === 'function') {
        setTimeout(() => {
          this.calculateEstimate();
        }, 1000);
      }

      await this.ordersTrader.subscribeFields?.({
        source: this,
        fieldDatumPairs: {
          // For estimate().
          traderEvent: TRADER_DATUM.TRADER,
          positionSize: TRADER_DATUM.POSITION_SIZE,
          positionAverage: TRADER_DATUM.POSITION_AVERAGE
        }
      });

      this.level1Trader = await ppp.getOrCreateTrader(
        this.document.level1Trader
      );

      if (this.document.extraLevel1Trader) {
        this.extraLevel1Trader = await ppp.getOrCreateTrader(
          this.document.extraLevel1Trader
        );
      }

      if (this.document.extraLevel1Trader2) {
        this.extraLevel1Trader2 = await ppp.getOrCreateTrader(
          this.document.extraLevel1Trader2
        );
      }

      await this.level1Trader.subscribeFields?.({
        source: this,
        fieldDatumPairs: {
          lastPrice: TRADER_DATUM.LAST_PRICE,
          lastPriceRelativeChange: TRADER_DATUM.LAST_PRICE_RELATIVE_CHANGE,
          lastPriceAbsoluteChange: TRADER_DATUM.LAST_PRICE_ABSOLUTE_CHANGE,
          bestBid: TRADER_DATUM.BEST_BID,
          bestAsk: TRADER_DATUM.BEST_ASK
        }
      });

      if (this.extraLevel1Trader) {
        await this.extraLevel1Trader.subscribeFields?.({
          source: this,
          fieldDatumPairs: {
            lastPrice: TRADER_DATUM.LAST_PRICE,
            lastPriceRelativeChange: TRADER_DATUM.LAST_PRICE_RELATIVE_CHANGE,
            lastPriceAbsoluteChange: TRADER_DATUM.LAST_PRICE_ABSOLUTE_CHANGE,
            bestBid: TRADER_DATUM.BEST_BID,
            bestAsk: TRADER_DATUM.BEST_ASK
          }
        });
      }

      if (this.extraLevel1Trader2) {
        await this.extraLevel1Trader2.subscribeFields?.({
          source: this,
          fieldDatumPairs: {
            lastPrice: TRADER_DATUM.LAST_PRICE,
            lastPriceRelativeChange: TRADER_DATUM.LAST_PRICE_RELATIVE_CHANGE,
            lastPriceAbsoluteChange: TRADER_DATUM.LAST_PRICE_ABSOLUTE_CHANGE,
            bestBid: TRADER_DATUM.BEST_BID,
            bestAsk: TRADER_DATUM.BEST_ASK
          }
        });
      }

      if (this.document.pusherApi) {
        this.pusherTelegramHandler = this.pusherTelegramHandler.bind(this);

        const connection = await ppp.getOrCreatePusherConnection(
          this.document.pusherApi
        );

        if (connection) {
          connection
            .channel('telegram')
            ?.bind('ticker', this.pusherTelegramHandler);
        }
      }

      this.calculateTotalAmount();
    } catch (e) {
      return this.catchException(e);
    }
  }

  async disconnectedCallback() {
    await this.ordersTrader?.unsubscribeFields?.({
      source: this,
      fieldDatumPairs: {
        traderEvent: TRADER_DATUM.TRADER,
        positionSize: TRADER_DATUM.POSITION_SIZE,
        positionAverage: TRADER_DATUM.POSITION_AVERAGE
      }
    });

    if (this.level1Trader) {
      await this.level1Trader.unsubscribeFields?.({
        source: this,
        fieldDatumPairs: {
          lastPrice: TRADER_DATUM.LAST_PRICE,
          lastPriceRelativeChange: TRADER_DATUM.LAST_PRICE_RELATIVE_CHANGE,
          lastPriceAbsoluteChange: TRADER_DATUM.LAST_PRICE_ABSOLUTE_CHANGE,
          bestBid: TRADER_DATUM.BEST_BID,
          bestAsk: TRADER_DATUM.BEST_ASK
        }
      });
    }

    if (this.extraLevel1Trader) {
      await this.extraLevel1Trader.unsubscribeFields?.({
        source: this,
        fieldDatumPairs: {
          lastPrice: TRADER_DATUM.LAST_PRICE,
          lastPriceRelativeChange: TRADER_DATUM.LAST_PRICE_RELATIVE_CHANGE,
          lastPriceAbsoluteChange: TRADER_DATUM.LAST_PRICE_ABSOLUTE_CHANGE,
          bestBid: TRADER_DATUM.BEST_BID,
          bestAsk: TRADER_DATUM.BEST_ASK
        }
      });
    }

    if (this.extraLevel1Trader2) {
      await this.extraLevel1Trader2.unsubscribeFields?.({
        source: this,
        fieldDatumPairs: {
          lastPrice: TRADER_DATUM.LAST_PRICE,
          lastPriceRelativeChange: TRADER_DATUM.LAST_PRICE_RELATIVE_CHANGE,
          lastPriceAbsoluteChange: TRADER_DATUM.LAST_PRICE_ABSOLUTE_CHANGE,
          bestBid: TRADER_DATUM.BEST_BID,
          bestAsk: TRADER_DATUM.BEST_ASK
        }
      });
    }

    if (this.ordersTrader) {
      if (this.document.pusherApi) {
        const connection = await ppp.getOrCreatePusherConnection(
          this.document.pusherApi
        );

        if (connection) {
          connection
            .channel('telegram')
            ?.unbind('ticker', this.pusherTelegramHandler);
        }
      }
    }

    super.disconnectedCallback();
  }

  pusherTelegramHandler(data) {
    if (typeof data.t === 'string')
      return this.selectInstrument(data.t.toUpperCase().split('~')[0]);
  }

  traderEventChanged(oldValue, newValue) {
    if (typeof newValue === 'object' && newValue?.event === 'estimate') {
      this.calculateEstimate();
    }
  }

  instrumentChanged(oldValue, newValue) {
    super.instrumentChanged(oldValue, newValue);

    // Clear price after instrument changes.
    if (
      this.price &&
      (!this.ordersTrader.instrumentsAreEqual(oldValue, newValue) || !oldValue)
    ) {
      setTimeout(() => {
        this.price.value = '';
        this.price.focus();

        return this.saveLastPriceValue();
      }, 100);
    }

    Updates.enqueue(() => this.calculateEstimate());
  }

  getActiveWidgetTab() {
    if (/market|limit|conditional/i.test(this.document.activeTab))
      return this.document.activeTab;
    else return 'limit';
  }

  async handleHotkeys(event) {
    if (this.document.buyShortcut !== this.document.sellShortcut) {
      if (
        this.document.buyShortcut &&
        event.code === this.document.buyShortcut
      ) {
        return await this.buyOrSell('buy');
      } else if (
        this.document.sellShortcut &&
        event.code === this.document.sellShortcut
      ) {
        return await this.buyOrSell('sell');
      }
    }

    if (
      this.document.searchShortcut &&
      event.code === this.document.searchShortcut
    ) {
      this.dispatchEvent(new CustomEvent('pointerdown'));

      this.searchControl.open = true;

      Updates.enqueue(() => this.searchControl.suggestInput.focus());
    }

    if (
      this.document.cancelAllOrdersShortcut &&
      event.code === this.document.cancelAllOrdersShortcut
    ) {
      if (typeof this.ordersTrader?.cancelAllLimitOrders !== 'function') {
        return this.notificationsArea.error({
          text: 'Трейдер не поддерживает отмену всех заявок.'
        });
      }

      this.topLoader.start();

      try {
        await this.ordersTrader?.cancelAllLimitOrders?.({
          instrument: this.instrument
        });

        this.notificationsArea.success({
          title: 'Заявки отменены'
        });
      } catch (e) {
        console.log(e);

        this.notificationsArea.error({
          text: 'Не удалось отменить заявки.'
        });
      } finally {
        this.topLoader.stop();
      }
    }
  }

  handleFastVolumeClick({ event }) {
    if (!this.instrument) return;

    const radio = event
      .composedPath()
      .find((n) => n.tagName?.toLowerCase?.() === 'ppp-widget-box-radio');

    this.setQuantityFromFastButtonRadio(radio);
  }

  handleFastVolumeDblClick({ event }) {
    if (this.document.doNotLockFastVolume) {
      return;
    }

    const radio = event
      .composedPath()
      .find((n) => n.tagName?.toLowerCase?.() === 'ppp-widget-box-radio');

    if (radio) {
      if (this.fastVolumeButtons.value === radio.value) {
        this.fastVolumeButtons.value = null;
        this.fastVolumeButtons.slottedRadioButtons.forEach((b) => {
          b.checked = false;
        });
      } else {
        this.fastVolumeButtons.value = radio.value;
      }

      void this.updateDocumentFragment({
        $set: {
          'widgets.$.selectedFastVolume': this.fastVolumeButtons.value
        }
      });
    }
  }

  getFastVolumeButtonsData() {
    if (typeof this.document.fastVolumes !== 'string') {
      return [];
    }

    const result = [];

    this.document.fastVolumes.split(';').forEach((v) => {
      let isInMoney = false;

      if (v[0] === '~') {
        v = v.substring(1);
        isInMoney = true;
      }

      v = v.replaceAll(',', '.').trim();

      const multiplier = v[v.length - 1];
      let volume = parseFloat(v);

      if (multiplier) {
        if (multiplier.toLowerCase() === 'k') volume *= 1000;
        else if (multiplier.toLowerCase() === 'm') volume /= 1000;
        else if (multiplier.toLowerCase() === 'M') volume *= 10000000;
      }

      if (volume > 0) {
        result.push({
          text: v.replaceAll('.', decSeparator),
          isInMoney,
          volume
        });
      }
    });

    return result;
  }

  @debounce(250)
  calculateCommission() {
    if (
      !this.instrument?.notSupported &&
      typeof this.ordersTrader?.estimate === 'function'
    ) {
      this.commission = '—';

      const price = stringToFloat(this.price?.value);

      if (!isNaN(price) && price) {
        const quantity = stringToFloat(this.quantity?.value);

        this.ordersTrader
          .estimate(this.instrument, price, quantity)
          .then((estimate) => {
            this.commission = estimate.commission;
          })
          .catch((error) => {
            console.log(error);

            this.notificationsArea.error({
              title: 'Ошибка заявки',
              text: 'Не удалось рассчитать комиссию.'
            });
          });
      }
    }
  }

  @debounce(250)
  calculateEstimate() {
    if (
      !this.instrument?.notSupported &&
      typeof this.ordersTrader?.estimate === 'function'
    ) {
      this.marginBuyingPowerQuantity = '—';
      this.marginSellingPowerQuantity = '—';
      this.commission = '—';
      this.buyingPowerQuantity = '—';
      this.sellingPowerQuantity = '—';

      const price = stringToFloat(this.price?.value);

      if (!isNaN(price) && price) {
        const quantity = stringToFloat(this.quantity?.value);

        this.ordersTrader
          .estimate(this.instrument, price, quantity)
          .then((estimate) => {
            this.marginBuyingPowerQuantity = estimate.marginBuyingPowerQuantity;
            this.marginSellingPowerQuantity =
              estimate.marginSellingPowerQuantity;
            this.buyingPowerQuantity = estimate.buyingPowerQuantity;
            this.sellingPowerQuantity = estimate.sellingPowerQuantity;
            this.commission = estimate.commission;
          })
          .catch((error) => {
            console.log(error);

            this.notificationsArea.error({
              title: 'Ошибка заявки',
              text: 'Не удалось рассчитать комиссию.'
            });
          });
      }
    }
  }

  calculateTotalAmount(calculateEstimate = true) {
    if (!this.instrument) return;

    if (this.instrument.type === 'future') return;

    this.totalAmount =
      stringToFloat(this.price?.value) *
      stringToFloat(this.quantity?.value) *
      this.instrument.lot;

    if (calculateEstimate) {
      this.calculateEstimate();
    } else {
      this.calculateCommission();
    }
  }

  formatPrice(price) {
    return formatPrice(price, this.instrument);
  }

  setQuantityFromFastButtonRadio(radio) {
    if (radio) {
      const volume = stringToFloat(radio.getAttribute('volume'));
      const isInMoney = radio.hasAttribute('money');

      if (volume > 0) {
        if (isInMoney && this.ordersTrader) {
          this.setQuantity(
            +volume /
              this.instrument.lot /
              +this.ordersTrader.fixPrice(this.instrument, this.price.value),
            {
              focusOnQuantity: false
            }
          );
        } else {
          this.setQuantity(
            +volume.toFixed(getInstrumentQuantityPrecision(this.instrument)),
            {
              focusOnQuantity: false
            }
          );
        }
      }
    }
  }

  setPrice(price) {
    if (this.price && price > 0) {
      if (this.orderTypeTabs && this.orderTypeTabs.activeid !== 'limit') {
        this.orderTypeTabs.activeid = 'limit';

        void this.updateDocumentFragment({
          $set: {
            'widgets.$.activeTab': 'limit'
          }
        });

        setTimeout(() => {
          this.price.focus();

          const length = this.price.control.value.length;

          this.price.control.setSelectionRange(length, length);
        }, 25);
      }

      this.price.value = price.toString().replace('.', decSeparator);

      this.calculateTotalAmount();
      this.price.focus();

      // Locked quantity mode.
      if (typeof this?.fastVolumeButtons?.value !== 'undefined') {
        const radio = this?.fastVolumeButtons.slottedRadioButtons.find(
          (b) => b.value === this.fastVolumeButtons.value
        );

        this.setQuantityFromFastButtonRadio(radio);
      }

      this.saveLastPriceValue();
    }
  }

  saveLastPriceValue() {
    return this.updateDocumentFragment({
      $set: {
        'widgets.$.lastPrice': stringToFloat(this.price.value)
      }
    });
  }

  @debounce(250)
  saveLastPriceValueDelayed() {
    return this.saveLastPriceValue();
  }

  setQuantity(quantity, options = {}) {
    if (options.force && quantity === 0) {
      this.quantity.value = '';
      this.commission = 0;
      this.totalAmount = '—';

      if (options.focusOnQuantity !== false) this.quantity.focus();

      return;
    }

    if (this.instrument && quantity > 0 && quantity !== Infinity) {
      const precision = getInstrumentQuantityPrecision(this.instrument);

      this.quantity.value =
        Math.trunc(+quantity * Math.pow(10, precision)) /
        Math.pow(10, precision);

      this.calculateTotalAmount(false);

      if (options.focusOnQuantity !== false) this.quantity.focus();

      this.saveLastQuantityValue();
    }
  }

  @debounce(250)
  saveLastQuantityValue() {
    return this.updateDocumentFragment({
      $set: {
        'widgets.$.lastQuantity': stringToFloat(this.quantity.value)
      }
    });
  }

  formatPositionSize() {
    let size = 0;
    let suffix = this.document.displaySizeInUnits ? 'шт.' : 'л.';

    if (this.instrument) {
      size = this.positionSize ?? 0;

      if (this.document.displaySizeInUnits) size *= this.instrument.lot ?? 1;
    }

    return `${size} ${suffix}`;
  }

  async buyOrSell(direction) {
    if (!this.ordersTrader) {
      return this.notificationsArea.error({
        title: 'Ошибка заявки',
        text: 'Отсутствует трейдер для выставления заявок.'
      });
    }

    this.topLoader.start();

    try {
      if (this.orderTypeTabs?.activeid === 'limit') {
        if (typeof this.ordersTrader.placeLimitOrder !== 'function') {
          return this.notificationsArea.error({
            title: 'Ошибка заявки',
            text: 'Трейдер не поддерживает выставление лимитных заявок.'
          });
        }

        await this.ordersTrader.placeLimitOrder({
          instrument: this.instrument,
          price: this.price.value,
          quantity: this.quantity.value,
          direction,
          destination: this.destination?.value,
          tif: this.tif?.value
        });
      } else if (this.orderTypeTabs?.activeid === 'market') {
        if (typeof this.ordersTrader.placeMarketOrder !== 'function') {
          return this.notificationsArea.error({
            title: 'Ошибка заявки',
            text: 'Трейдер не поддерживает выставление рыночных заявок.'
          });
        }

        await this.ordersTrader.placeMarketOrder({
          instrument: this.instrument,
          quantity: this.quantity.value,
          direction,
          destination: this.destination?.value,
          tif: this.tif?.value
        });
      } else if (this.orderTypeTabs?.activeid === 'conditional') {
        console.log(this.orderTypeTabs.activeid);
      }

      return this.notificationsArea.success({
        title: 'Заявка выставлена'
      });
    } catch (e) {
      console.log(e);

      return this.notificationsArea.error({
        title: 'Заявка не выставлена',
        text: await this.ordersTrader?.formatError?.(this.instrument, e)
      });
    } finally {
      this.topLoader.stop();
    }
  }

  async validate() {
    if (this.container.buyShortcut.value && this.container.sellShortcut.value) {
      await validate(this.container.sellShortcut, {
        hook: async () =>
          this.container.buyShortcut.value !==
          this.container.sellShortcut.value,
        errorMessage: 'Горячие клавиши Buy/Sell должны различаться'
      });
    }
  }

  async submit() {
    return {
      $set: {
        ordersTraderId: this.container.ordersTraderId.value,
        level1TraderId: this.container.level1TraderId.value,
        extraLevel1TraderId: this.container.extraLevel1TraderId.value,
        extraLevel1Trader2Id: this.container.extraLevel1Trader2Id.value,
        pusherApiId: this.container.pusherApiId.value,
        buyShortcut: this.container.buyShortcut.value.trim(),
        sellShortcut: this.container.sellShortcut.value.trim(),
        searchShortcut: this.container.searchShortcut.value.trim(),
        cancelAllOrdersShortcut:
          this.container.cancelAllOrdersShortcut.value.trim(),
        fastVolumes: this.container.fastVolumes.value.trim(),
        doNotLockFastVolume: this.container.doNotLockFastVolume.checked,
        displaySizeInUnits: this.container.displaySizeInUnits.checked,
        changePriceQuantityViaMouseWheel:
          this.container.changePriceQuantityViaMouseWheel.checked,
        showLastPriceInHeader: this.container.showLastPriceInHeader.checked,
        showAbsoluteChangeInHeader:
          this.container.showAbsoluteChangeInHeader.checked,
        showRelativeChangeInHeader:
          this.container.showRelativeChangeInHeader.checked,
        showOrderTypeTabs: this.container.showOrderTypeTabs.checked,
        showBestBidAndAsk: this.container.showBestBidAndAsk.checked,
        showAmountSection: this.container.showAmountSection.checked,
        showEstimateSection: this.container.showEstimateSection.checked
      }
    };
  }
}

export async function widgetDefinition() {
  return {
    type: WIDGET_TYPES.ORDER,
    collection: 'PPP',
    title: html`Заявка`,
    description: html`Виджет <span class="positive">Заявка</span> используется,
      чтобы выставлять рыночные, лимитные и условные биржевые заявки.`,
    customElement: OrderWidget.compose({
      template: orderWidgetTemplate,
      styles: orderWidgetStyles
    }).define(),
    minWidth: 230,
    minHeight: 120,
    defaultWidth: 290,
    settings: html`
      <ppp-tabs activeid="traders">
        <ppp-tab id="traders">Подключения</ppp-tab>
        <ppp-tab id="ui">UI</ppp-tab>
        <ppp-tab id="hotkeys">Горячие клавиши</ppp-tab>
        <ppp-tab id="conditionals" disabled>Заявки</ppp-tab>
        <ppp-tab-panel id="traders-panel">
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Трейдер инструментов и заявок</h5>
              <p class="description">
                Трейдер, который будет выставлять заявки, а также фильтровать
                инструменты в поиске.
              </p>
            </div>
            <div class="control-line flex-start">
              <ppp-query-select
                ${ref('ordersTraderId')}
                standalone
                deselectable
                placeholder="Опционально, нажмите для выбора"
                value="${(x) => x.document.ordersTraderId}"
                :context="${(x) => x}"
                :preloaded="${(x) => x.document.ordersTrader ?? ''}"
                :query="${() => {
                  return (context) => {
                    return context.services
                      .get('mongodb-atlas')
                      .db('ppp')
                      .collection('traders')
                      .find({
                        $and: [
                          {
                            caps: {
                              $all: [
                                `[%#(await import(ppp.rootUrl + '/lib/const.js')).TRADER_CAPS.CAPS_LIMIT_ORDERS%]`,
                                `[%#(await import(ppp.rootUrl + '/lib/const.js')).TRADER_CAPS.CAPS_MARKET_ORDERS%]`
                              ]
                            }
                          },
                          {
                            $or: [
                              { removed: { $ne: true } },
                              { _id: `[%#this.document.ordersTraderId ?? ''%]` }
                            ]
                          }
                        ]
                      })
                      .sort({ updatedAt: -1 });
                  };
                }}"
                :transform="${() => ppp.decryptDocumentsTransformation()}"
              ></ppp-query-select>
              <ppp-button
                appearance="default"
                @click="${() => window.open('?page=trader', '_blank').focus()}"
              >
                +
              </ppp-button>
            </div>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Трейдер L1</h5>
              <p class="description">
                Трейдер, выступающий источником L1-данных виджета.
              </p>
            </div>
            <div class="control-line flex-start">
              <ppp-query-select
                ${ref('level1TraderId')}
                standalone
                deselectable
                placeholder="Опционально, нажмите для выбора"
                value="${(x) => x.document.level1TraderId}"
                :context="${(x) => x}"
                :preloaded="${(x) => x.document.level1Trader ?? ''}"
                :query="${() => {
                  return (context) => {
                    return context.services
                      .get('mongodb-atlas')
                      .db('ppp')
                      .collection('traders')
                      .find({
                        $and: [
                          {
                            caps: `[%#(await import(ppp.rootUrl + '/lib/const.js')).TRADER_CAPS.CAPS_LEVEL1%]`
                          },
                          {
                            $or: [
                              { removed: { $ne: true } },
                              { _id: `[%#this.document.level1TraderId ?? ''%]` }
                            ]
                          }
                        ]
                      })
                      .sort({ updatedAt: -1 });
                  };
                }}"
                :transform="${() => ppp.decryptDocumentsTransformation()}"
              ></ppp-query-select>
              <ppp-button
                appearance="default"
                @click="${() => window.open('?page=trader', '_blank').focus()}"
              >
                +
              </ppp-button>
            </div>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Дополнительный трейдер L1 #1</h5>
              <p class="description">
                Трейдер, выступающий дополнительным источником L1-данных
                виджета.
              </p>
            </div>
            <div class="control-line flex-start">
              <ppp-query-select
                ${ref('extraLevel1TraderId')}
                standalone
                deselectable
                placeholder="Опционально, нажмите для выбора"
                value="${(x) => x.document.extraLevel1TraderId}"
                :context="${(x) => x}"
                :preloaded="${(x) => x.document.extraLevel1Trader ?? ''}"
                :query="${() => {
                  return (context) => {
                    return context.services
                      .get('mongodb-atlas')
                      .db('ppp')
                      .collection('traders')
                      .find({
                        $and: [
                          {
                            caps: `[%#(await import(ppp.rootUrl + '/lib/const.js')).TRADER_CAPS.CAPS_LEVEL1%]`
                          },
                          {
                            $or: [
                              { removed: { $ne: true } },
                              {
                                _id: `[%#this.document.extraLevel1TraderId ?? ''%]`
                              }
                            ]
                          }
                        ]
                      })
                      .sort({ updatedAt: -1 });
                  };
                }}"
                :transform="${() => ppp.decryptDocumentsTransformation()}"
              ></ppp-query-select>
              <ppp-button
                appearance="default"
                @click="${() => window.open('?page=trader', '_blank').focus()}"
              >
                +
              </ppp-button>
            </div>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Дополнительный трейдер L1 #2</h5>
              <p class="description">
                Трейдер, выступающий дополнительным источником L1-данных
                виджета.
              </p>
            </div>
            <div class="control-line flex-start">
              <ppp-query-select
                ${ref('extraLevel1Trader2Id')}
                standalone
                deselectable
                placeholder="Опционально, нажмите для выбора"
                value="${(x) => x.document.extraLevel1Trader2Id}"
                :context="${(x) => x}"
                :preloaded="${(x) => x.document.extraLevel1Trader2 ?? ''}"
                :query="${() => {
                  return (context) => {
                    return context.services
                      .get('mongodb-atlas')
                      .db('ppp')
                      .collection('traders')
                      .find({
                        $and: [
                          {
                            caps: `[%#(await import(ppp.rootUrl + '/lib/const.js')).TRADER_CAPS.CAPS_LEVEL1%]`
                          },
                          {
                            $or: [
                              { removed: { $ne: true } },
                              {
                                _id: `[%#this.document.extraLevel1Trader2Id ?? ''%]`
                              }
                            ]
                          }
                        ]
                      })
                      .sort({ updatedAt: -1 });
                  };
                }}"
                :transform="${() => ppp.decryptDocumentsTransformation()}"
              ></ppp-query-select>
              <ppp-button
                appearance="default"
                @click="${() => window.open('?page=trader', '_blank').focus()}"
              >
                +
              </ppp-button>
            </div>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Интеграция с Pusher</h5>
              <p class="description">
                Для управления виджетом из внешних систем.
              </p>
            </div>
            <div class="widget-settings-input-group">
              <div class="control-line flex-start">
                <ppp-query-select
                  ${ref('pusherApiId')}
                  standalone
                  deselectable
                  placeholder="Опционально, нажмите для выбора"
                  value="${(x) => x.document.pusherApiId}"
                  :context="${(x) => x}"
                  :preloaded="${(x) => x.document.pusherApi ?? ''}"
                  :query="${() => {
                    return (context) => {
                      return context.services
                        .get('mongodb-atlas')
                        .db('ppp')
                        .collection('apis')
                        .find({
                          $and: [
                            {
                              type: `[%#(await import(ppp.rootUrl + '/lib/const.js')).APIS.PUSHER%]`
                            },
                            {
                              $or: [
                                { removed: { $ne: true } },
                                {
                                  _id: `[%#this.document.pusherApiId ?? ''%]`
                                }
                              ]
                            }
                          ]
                        })
                        .sort({ updatedAt: -1 });
                    };
                  }}"
                  :transform="${() =>
                    ppp.decryptDocumentsTransformation(['key'])}"
                ></ppp-query-select>
                <ppp-button
                  appearance="default"
                  @click="${() =>
                    window.open('?page=api-pusher', '_blank').focus()}"
                >
                  +
                </ppp-button>
              </div>
            </div>
          </div>
        </ppp-tab-panel>
        <ppp-tab-panel id="ui-panel">
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Кнопки быстрого объёма</h5>
              <p class="description">
                Перечислите значения через точку с запятой. Нажатие на кнопку
                подставляет номинал в поле количества. Поставьте ~ перед
                значением, чтобы указать объём в единицах валюты.
              </p>
            </div>
            <div class="widget-settings-input-group">
              <ppp-text-field
                optional
                placeholder="1;10;100;1k;~100;~500;~1k"
                value="${(x) => x.document.fastVolumes}"
                @beforeinput="${(x, { event }) => {
                  return event.data === null || /[0-9.,;~kmM]/.test(event.data);
                }}"
                ${ref('fastVolumes')}
              ></ppp-text-field>
            </div>
            <div class="spacing1"></div>
            <ppp-checkbox
              ?checked="${(x) => x.document.doNotLockFastVolume ?? false}"
              ${ref('doNotLockFastVolume')}
            >
              Не фиксировать объём двойным нажатием на кнопки
            </ppp-checkbox>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Интерфейс</h5>
            </div>
            <ppp-checkbox
              ?checked="${(x) => x.document.displaySizeInUnits}"
              ${ref('displaySizeInUnits')}
            >
              Показывать количество инструмента в портфеле в штуках
            </ppp-checkbox>
            <ppp-checkbox
              ?checked="${(x) => x.document.changePriceQuantityViaMouseWheel}"
              ${ref('changePriceQuantityViaMouseWheel')}
            >
              Изменять цену и количество колесом мыши
            </ppp-checkbox>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Наполнение</h5>
            </div>
            <ppp-checkbox
              ?checked="${(x) => x.document.showLastPriceInHeader ?? true}"
              ${ref('showLastPriceInHeader')}
            >
              Показывать последнюю цену в заголовке
            </ppp-checkbox>
            <ppp-checkbox
              ?checked="${(x) => x.document.showAbsoluteChangeInHeader ?? true}"
              ${ref('showAbsoluteChangeInHeader')}
            >
              Показывать абсолютное изменение цены в заголовке
            </ppp-checkbox>
            <ppp-checkbox
              ?checked="${(x) => x.document.showRelativeChangeInHeader ?? true}"
              ${ref('showRelativeChangeInHeader')}
            >
              Показывать относительное изменение цены в заголовке
            </ppp-checkbox>
            <ppp-checkbox
              ?checked="${(x) => x.document.showOrderTypeTabs ?? true}"
              ${ref('showOrderTypeTabs')}
            >
              Показывать вкладки с типом заявки
            </ppp-checkbox>
            <ppp-checkbox
              ?checked="${(x) => x.document.showBestBidAndAsk ?? true}"
              ${ref('showBestBidAndAsk')}
            >
              Показывать лучшие цены <span class="positive">bid</span> и
              <span class="negative">ask</span>
            </ppp-checkbox>
            <ppp-checkbox
              ?checked="${(x) => x.document.showAmountSection ?? true}"
              ${ref('showAmountSection')}
            >
              Показывать секцию с комиссией и стоимостью
            </ppp-checkbox>
            <ppp-checkbox
              ?checked="${(x) => x.document.showEstimateSection ?? true}"
              ${ref('showEstimateSection')}
            >
              Показывать секцию «Доступно/С плечом»
            </ppp-checkbox>
          </div>
        </ppp-tab-panel>
        <ppp-tab-panel id="hotkeys-panel">
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Горячая клавиша для покупки</h5>
              <p class="description">
                Покупка сработает, если фокус ввода будет находиться в поле цены
                или количества. Нажмите Esc, чтобы отменить эту функцию.
              </p>
            </div>
            <div class="widget-settings-input-group">
              <ppp-text-field
                optional
                placeholder="Не задана"
                value="${(x) => x.document.buyShortcut}"
                @keydown="${(x, { event }) => {
                  if (
                    +event.key === parseInt(event.key) ||
                    /Comma|Period|Tab|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete/i.test(
                      event.code
                    )
                  )
                    return false;

                  if (event.key === 'Escape') {
                    x.buyShortcut.value = '';
                  } else {
                    x.buyShortcut.value = event.code;
                  }

                  return false;
                }}"
                ${ref('buyShortcut')}
              ></ppp-text-field>
            </div>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Горячая клавиша для продажи</h5>
              <p class="description">
                Продажа сработает, если фокус ввода будет находиться в поле цены
                или количества. Нажмите Esc, чтобы отменить эту функцию.
              </p>
            </div>
            <div class="widget-settings-input-group">
              <ppp-text-field
                optional
                placeholder="Не задана"
                value="${(x) => x.document.sellShortcut}"
                @keydown="${(x, { event }) => {
                  if (
                    +event.key === parseInt(event.key) ||
                    /Comma|Period|Tab|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete/i.test(
                      event.code
                    )
                  )
                    return false;

                  if (event.key === 'Escape') {
                    x.sellShortcut.value = '';
                  } else {
                    x.sellShortcut.value = event.code;
                  }

                  return false;
                }}"
                ${ref('sellShortcut')}
              ></ppp-text-field>
            </div>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Горячая клавиша для поиска инструментов</h5>
              <p class="description">
                Если фокус ввода будет находиться в поле цены или количества, то
                откроется окно поиска инструмента. Нажмите Esc, чтобы отменить
                эту функцию.
              </p>
            </div>
            <div class="widget-settings-input-group">
              <ppp-text-field
                optional
                placeholder="Не задана"
                value="${(x) => x.document.searchShortcut}"
                @keydown="${(x, { event }) => {
                  if (
                    +event.key === parseInt(event.key) ||
                    /Comma|Period|Tab|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete/i.test(
                      event.code
                    )
                  )
                    return false;

                  if (event.key === 'Escape') {
                    x.searchShortcut.value = '';
                  } else {
                    x.searchShortcut.value = event.code;
                  }

                  return false;
                }}"
                ${ref('searchShortcut')}
              ></ppp-text-field>
            </div>
          </div>
          <div class="widget-settings-section">
            <div class="widget-settings-label-group">
              <h5>Горячая клавиша для отмены всех активных заявок</h5>
              <p class="description">
                Если фокус ввода будет находиться в поле цены или количества, то
                будут отменены активные заявки по текущему инструменту виджета.
                Нажмите Esc, чтобы отменить эту функцию.
              </p>
            </div>
            <div class="widget-settings-input-group">
              <ppp-text-field
                optional
                placeholder="Не задана"
                value="${(x) => x.document.cancelAllOrdersShortcut}"
                @keydown="${(x, { event }) => {
                  if (
                    +event.key === parseInt(event.key) ||
                    /Comma|Period|Tab|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete/i.test(
                      event.code
                    )
                  )
                    return false;

                  if (event.key === 'Escape') {
                    x.cancelAllOrdersShortcut.value = '';
                  } else {
                    x.cancelAllOrdersShortcut.value = event.code;
                  }

                  return false;
                }}"
                ${ref('cancelAllOrdersShortcut')}
              ></ppp-text-field>
            </div>
          </div>
        </ppp-tab-panel>
        <ppp-tab-panel id="conditionals-panel">
          <ppp-banner class="inline" appearance="warning">
            В этом разделе настраиваются условные заявки, которые будут доступны
            на соответствующей вкладке виджета.
          </ppp-banner>
        </ppp-tab-panel>
      </ppp-tabs>
    `
  };
}
