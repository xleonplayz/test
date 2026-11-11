//! Pricing rules: volume discount, promo codes, VAT per country and category,
//! and shipping. All amounts are integer euro cents.

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct QuoteRequest {
    #[serde(default = "default_country")]
    pub country: String,
    #[serde(default)]
    pub promo: String,
    pub items: Vec<Item>,
}

fn default_country() -> String {
    "DE".into()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub sku: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub category: String,
    pub unit_cents: i64,
    pub qty: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Line {
    pub sku: String,
    pub name: String,
    pub qty: i64,
    pub unit_cents: i64,
    pub net_cents: i64,
    pub discount_cents: i64,
    pub vat_rate_pct: f64,
    pub tax_cents: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Quote {
    pub country: String,
    pub promo: Option<String>,
    pub lines: Vec<Line>,
    pub subtotal_cents: i64,
    pub discount_cents: i64,
    pub tax_cents: i64,
    pub shipping_cents: i64,
    pub total_cents: i64,
    pub notes: Vec<String>,
}

/// VAT rate in percent for a country and product category.
pub fn vat_rate(country: &str, category: &str) -> Option<f64> {
    let reduced = matches!(category, "food" | "books");
    Some(match (country, reduced) {
        ("DE", false) => 19.0,
        ("DE", true) => 7.0,
        ("AT", false) => 20.0,
        ("AT", true) => 10.0,
        ("FR", false) => 20.0,
        ("FR", true) => 5.5,
        ("NL", false) => 21.0,
        ("NL", true) => 9.0,
        ("CH", _) => 0.0, // export outside the EU, no VAT charged
        _ => return None,
    })
}

fn round_div(value: i64, pct_times_10: i64) -> i64 {
    // value * pct / 100, with pct given in tenths of a percent; rounds half up.
    (value * pct_times_10 + 500) / 1000
}

pub fn quote(req: &QuoteRequest) -> Result<Quote, String> {
    let country = req.country.trim().to_ascii_uppercase();
    let promo = req.promo.trim().to_ascii_uppercase();
    let mut notes = Vec::new();
    let promo_pct = match promo.as_str() {
        "" => 0,
        "WELCOME10" => 100,
        "TEA20" => 200,
        other => {
            notes.push(format!("promo code {other} is not valid"));
            0
        }
    };
    let mut lines = Vec::new();
    for it in &req.items {
        if it.qty <= 0 || it.unit_cents < 0 {
            return Err(format!("invalid quantity or price for {}", it.sku));
        }
        let rate = vat_rate(&country, &it.category)
            .ok_or_else(|| format!("we do not ship to {country}"))?;
        let net = it.unit_cents * it.qty;
        // 10 % off the line from three pieces of one product on.
        let volume = if it.qty >= 3 { round_div(net, 100) } else { 0 };
        if volume > 0 {
            notes.push(format!("volume discount on {}", it.sku));
        }
        let promo_off = round_div(net - volume, promo_pct);
        let discount = volume + promo_off;
        let tax = round_div(net - discount, (rate * 10.0).round() as i64);
        lines.push(Line {
            sku: it.sku.clone(),
            name: it.name.clone(),
            qty: it.qty,
            unit_cents: it.unit_cents,
            net_cents: net,
            discount_cents: discount,
            vat_rate_pct: rate,
            tax_cents: tax,
        });
    }
    let subtotal: i64 = lines.iter().map(|l| l.net_cents).sum();
    let discount: i64 = lines.iter().map(|l| l.discount_cents).sum();
    let tax: i64 = lines.iter().map(|l| l.tax_cents).sum();
    let goods = subtotal - discount;
    let shipping = if lines.is_empty() || goods >= 5000 {
        0
    } else if country == "DE" {
        490
    } else {
        990
    };
    if shipping == 0 && !lines.is_empty() {
        notes.push("free shipping".into());
    }
    Ok(Quote {
        country,
        promo: (promo_pct > 0).then_some(promo),
        lines,
        subtotal_cents: subtotal,
        discount_cents: discount,
        tax_cents: tax,
        shipping_cents: shipping,
        total_cents: goods + tax + shipping,
        notes,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(sku: &str, category: &str, unit: i64, qty: i64) -> Item {
        Item { sku: sku.into(), name: sku.into(), category: category.into(), unit_cents: unit, qty }
    }

    #[test]
    fn german_vat_and_shipping() {
        let q = quote(&QuoteRequest {
            country: "de".into(),
            promo: String::new(),
            items: vec![item("CUP", "goods", 1850, 1), item("TEA", "food", 990, 1)],
        })
        .unwrap();
        assert_eq!(q.subtotal_cents, 2840);
        // 1850 * 19 % = 351.5 -> 352, 990 * 7 % = 69.3 -> 69
        assert_eq!(q.tax_cents, 352 + 69);
        assert_eq!(q.shipping_cents, 490);
        assert_eq!(q.total_cents, 2840 + 421 + 490);
    }

    #[test]
    fn volume_and_promo() {
        let q = quote(&QuoteRequest {
            country: "DE".into(),
            promo: "welcome10".into(),
            items: vec![item("POT", "goods", 4900, 3)],
        })
        .unwrap();
        // 14700, volume 1470, promo 10 % of 13230 = 1323
        assert_eq!(q.discount_cents, 1470 + 1323);
        assert_eq!(q.shipping_cents, 0);
    }

    #[test]
    fn unknown_country_is_refused() {
        let r = quote(&QuoteRequest { country: "XX".into(), promo: String::new(), items: vec![item("A", "goods", 100, 1)] });
        assert!(r.is_err());
    }
}
