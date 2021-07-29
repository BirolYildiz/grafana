import { config } from '@grafana/runtime';
import { gt } from 'semver';
import { PluginSignatureStatus } from '../../../../../packages/grafana-data/src';
import { CatalogPlugin, CatalogPluginDetails, LocalPlugin, Plugin, Version } from './types';

export function isGrafanaAdmin(): boolean {
  return config.bootData.user.isGrafanaAdmin;
}

export function mapRemoteToCatalog(plugin: Plugin): CatalogPlugin {
  const {
    name,
    slug: id,
    description,
    version,
    orgName,
    popularity,
    downloads,
    typeCode,
    updatedAt,
    createdAt: publishedAt,
    status,
    versionSignatureType,
    signatureType,
  } = plugin;

  const hasSignature = signatureType !== '' || versionSignatureType !== '';
  const catalogPlugin = {
    description,
    downloads,
    id,
    info: {
      logos: {
        small: `https://grafana.com/api/plugins/${id}/versions/${version}/logos/small`,
        large: `https://grafana.com/api/plugins/${id}/versions/${version}/logos/large`,
      },
    },
    name,
    orgName,
    popularity,
    publishedAt,
    signature: hasSignature ? PluginSignatureStatus.valid : PluginSignatureStatus.invalid,
    updatedAt,
    version,
    hasUpdate: false,
    isInstalled: false,
    isCore: plugin.internal,
    isDev: false,
    isEnterprise: status === 'enterprise',
    type: typeCode,
  };
  return catalogPlugin;
}

export function mapLocalToCatalog(plugin: LocalPlugin): CatalogPlugin {
  const {
    name,
    info: { description, version, logos, updated, author },
    id,
    signature,
    dev,
    type,
  } = plugin;
  return {
    description,
    downloads: 0,
    id,
    info: { logos },
    name,
    orgName: author.name,
    popularity: 0,
    publishedAt: '',
    signature,
    updatedAt: updated,
    version,
    hasUpdate: false,
    isInstalled: true,
    isCore: signature === 'internal',
    isDev: Boolean(dev),
    isEnterprise: false,
    type,
  };
}

export function mapToCatalogPlugin(local?: LocalPlugin, remote?: Plugin): CatalogPlugin {
  const version = remote?.version || local?.info.version || '';
  const hasUpdate = Boolean(remote?.version && local?.info.version && gt(remote?.version, local?.info.version));
  const id = remote?.slug || local?.id || '';

  let logos = {
    small: 'https://grafana.com/api/plugins/404notfound/versions/none/logos/small',
    large: 'https://grafana.com/api/plugins/404notfound/versions/none/logos/large',
  };

  if (remote) {
    logos = {
      small: `https://grafana.com/api/plugins/${id}/versions/${version}/logos/small`,
      large: `https://grafana.com/api/plugins/${id}/versions/${version}/logos/large`,
    };
  } else if (local && local.info.logos) {
    logos = local.info.logos;
  }

  return {
    description: remote?.description || local?.info.description || '',
    downloads: remote?.downloads || 0,
    hasUpdate,
    id,
    info: {
      logos,
    },
    isCore: Boolean(remote?.internal || local?.signature === 'internal'),
    isDev: Boolean(local?.dev),
    isEnterprise: remote?.status === 'enterprise' || false,
    isInstalled: Boolean(local),
    name: remote?.name || local?.name || '',
    orgName: remote?.orgName || local?.info.author.name || '',
    popularity: remote?.popularity || 0,
    publishedAt: remote?.createdAt || '',
    type: remote?.typeCode || local?.type,
    signature: remote?.signature || local?.signature || PluginSignatureStatus.missing,
    updatedAt: remote?.updatedAt || local?.info.updated || '',
    version,
  };
}

export function getCatalogPluginDetails(
  local: LocalPlugin | undefined,
  remote: Plugin | undefined,
  pluginVersions: Version[] = []
): CatalogPluginDetails {
  const plugin = mapToCatalogPlugin(local, remote);

  return {
    ...plugin,
    grafanaDependency: remote?.json?.dependencies?.grafanaDependency || '',
    links: remote?.json?.info.links || local?.info.links || [],
    readme: remote?.readme || 'No plugin help or readme markdown file was found',
    versions: pluginVersions,
  };
}

export function applySearchFilter(searchBy: string | undefined, plugins: CatalogPlugin[]): CatalogPlugin[] {
  if (!searchBy) {
    return plugins;
  }

  return plugins.filter((plugin) => {
    const fields: String[] = [];

    if (plugin.name) {
      fields.push(plugin.name.toLowerCase());
    }

    if (plugin.orgName) {
      fields.push(plugin.orgName.toLowerCase());
    }

    return fields.some((f) => f.includes(searchBy.toLowerCase()));
  });
}
