import type { SectionType } from "./schema";

import Header from "../sections/Header.astro";
import Hero from "../sections/Hero.astro";
import TrustBar from "../sections/TrustBar.astro";
import ValueProp from "../sections/ValueProp.astro";
import Services from "../sections/Services.astro";
import ProcessSteps from "../sections/ProcessSteps.astro";
import Gallery from "../sections/Gallery.astro";
import FeatureHighlight from "../sections/FeatureHighlight.astro";
import WhyChooseUs from "../sections/WhyChooseUs.astro";
import Testimonials from "../sections/Testimonials.astro";
import FAQ from "../sections/FAQ.astro";
import CtaBanner from "../sections/CtaBanner.astro";
import ContactCTA from "../sections/ContactCTA.astro";
import StickyCta from "../sections/StickyCta.astro";
import Footer from "../sections/Footer.astro";

/**
 * Mappa `type` → componente Astro. Tipizzata `any` di proposito: il rendering
 * dinamico nel template non beneficerebbe del narrowing dell'union, mentre ogni
 * componente mantiene le proprie `Props` tipizzate internamente.
 */
export const registry: Record<SectionType, any> = {
  Header,
  Hero,
  TrustBar,
  ValueProp,
  Services,
  ProcessSteps,
  Gallery,
  FeatureHighlight,
  WhyChooseUs,
  Testimonials,
  FAQ,
  CtaBanner,
  ContactCTA,
  StickyCta,
  Footer,
};
